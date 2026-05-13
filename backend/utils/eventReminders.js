const { logEmail } = require("./logging");
const { sendEventNextDayReminderEmail } = require("./email");

const REMINDER_TIME_ZONE = "America/New_York";
const REMINDER_HOUR = 8;

function getTimeZoneParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}

function getTimeZoneOffsetMs(date, timeZone) {
  const parts = getTimeZoneParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - date.getTime();
}

function zonedDateTimeToUtc({ year, month, day, hour, minute, second }) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  let offset = getTimeZoneOffsetMs(new Date(utcGuess), REMINDER_TIME_ZONE);
  let result = new Date(utcGuess - offset);
  const adjustedOffset = getTimeZoneOffsetMs(result, REMINDER_TIME_ZONE);

  if (adjustedOffset !== offset) {
    offset = adjustedOffset;
    result = new Date(utcGuess - offset);
  }

  return result;
}

function addOneDay({ year, month, day }) {
  const nextDate = new Date(Date.UTC(year, month - 1, day));
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  return {
    year: nextDate.getUTCFullYear(),
    month: nextDate.getUTCMonth() + 1,
    day: nextDate.getUTCDate(),
  };
}

function getNextReminderRunDate(now = new Date()) {
  const localNow = getTimeZoneParts(now, REMINDER_TIME_ZONE);
  const afterTodayRun =
    localNow.hour > REMINDER_HOUR ||
    (localNow.hour === REMINDER_HOUR &&
      (localNow.minute > 0 || localNow.second > 0));

  const targetDate = afterTodayRun
    ? addOneDay(localNow)
    : {
        year: localNow.year,
        month: localNow.month,
        day: localNow.day,
      };

  return zonedDateTimeToUtc({
    ...targetDate,
    hour: REMINDER_HOUR,
    minute: 0,
    second: 0,
  });
}

function formatRunDateForLog(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: REMINDER_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

async function sendNextDayEventReminders(pool) {
  const [rows] = await pool.promise().query(
    `SELECT
      s.user_id,
      u.email,
      up.first_name,
      e.event_id,
      e.title AS event_title,
      e.start_datetime,
      sp.name AS provider_name,
      GROUP_CONCAT(
        DISTINCT CONCAT(
          COALESCE(vo.title, 'Volunteer shift'),
          CASE
            WHEN vs.start_datetime IS NOT NULL
              THEN CONCAT(' — Start: ', vs.start_datetime)
            ELSE ''
          END,
          CASE
            WHEN vs.end_datetime IS NOT NULL
              THEN CONCAT(' | End: ', vs.end_datetime)
            ELSE ''
          END
        )
        ORDER BY vs.start_datetime ASC
        SEPARATOR '\n'
      ) AS shift_summary
    FROM VolunteerSignup s
    JOIN VolunteerShift vs ON s.shift_id = vs.shift_id
    JOIN VolunteerOpportunity vo ON vs.opportunity_id = vo.opportunity_id
    JOIN Event e ON vo.event_id = e.event_id
    JOIN \`User\` u ON s.user_id = u.user_id
    LEFT JOIN UserProfile up ON s.user_id = up.user_id
    JOIN ServiceProvider sp ON vo.provider_id = sp.provider_id
    LEFT JOIN EmailLog el
      ON el.user_id = s.user_id
      AND el.event_id = e.event_id
      AND el.email_type = 'event_next_day_reminder'
    WHERE s.status = 'registered'
      AND vo.event_id IS NOT NULL
      AND DATE(e.start_datetime) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
      AND el.email_log_id IS NULL
    GROUP BY
      s.user_id,
      u.email,
      up.first_name,
      e.event_id,
      e.title,
      e.start_datetime,
      sp.name`,
  );

  for (const row of rows) {
    try {
      const result = await sendEventNextDayReminderEmail({
        to: row.email,
        firstName: row.first_name,
        eventTitle: row.event_title,
        providerName: row.provider_name,
        startDatetime: row.start_datetime,
        shiftSummary: row.shift_summary,
      });

      const status = result.sent ? "sent" : "queued";
      await logEmail(
        pool,
        row.user_id,
        row.event_id,
        "event_next_day_reminder",
        status,
      );
    } catch (err) {
      console.error(
        `Failed next-day reminder for user ${row.user_id}, event ${row.event_id}:`,
        err,
      );
      await logEmail(
        pool,
        row.user_id,
        row.event_id,
        "event_next_day_reminder",
        "failed",
      );
    }
  }
}

function startEventReminderJob(pool) {
  let timeoutId = null;
  let stopped = false;

  const run = async () => {
    try {
      await sendNextDayEventReminders(pool);
    } catch (err) {
      console.error("Event reminder job failed:", err);
    }
  };

  const scheduleNextRun = () => {
    if (stopped) return;

    const nextRunAt = getNextReminderRunDate();
    const delay = Math.max(nextRunAt.getTime() - Date.now(), 1000);

    console.log(
      `[Event reminders] Next run scheduled for ${formatRunDateForLog(nextRunAt)}`,
    );

    timeoutId = setTimeout(async () => {
      timeoutId = null;
      await run();
      scheduleNextRun();
    }, delay);

    timeoutId.unref?.();
  };

  scheduleNextRun();

  return {
    stop() {
      stopped = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
}

module.exports = {
  sendNextDayEventReminders,
  startEventReminderJob,
};
