async function logAudit(pool, actorUserId, action, entityType, entityId) {
  try {
    await pool.promise().query(
      `INSERT INTO AuditLog (actor_user_id, action, entity_type, entity_id, occured_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [actorUserId, action, entityType, entityId]
    );
  } catch (err) {
    console.error("Audit logging failed:", err);
  }
}

async function logEmail(pool, userId, eventId, emailType, status) {
  try {
    await pool.promise().query(
      `INSERT INTO EmailLog (user_id, event_id, email_type, send_at, status)
       VALUES (?, ?, ?, NOW(), ?)`,
      [userId, eventId, emailType, status]
    );
  } catch (err) {
    console.error("Email logging failed:", err);
  }
}

module.exports = {
  logAudit,
  logEmail
};
