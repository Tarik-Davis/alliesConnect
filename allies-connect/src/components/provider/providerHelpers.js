import { useState } from "react";
export { API_URL } from "../../config";

// Generate time options in 30-minute increments (12:00 AM to 11:30 PM)
export const TIME_OPTIONS = (() => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour24 = String(h).padStart(2, "0");
      const min = String(m).padStart(2, "0");
      const value = `${hour24}:${min}`;
      const period = h < 12 ? "AM" : "PM";
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${hour12}:${min} ${period}`;
      options.push({ value, label });
    }
  }
  return options;
})();

export function useTableDataProcessing(data, searchField) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [searchQuery, setSearchQuery] = useState("");

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const sortSymbol = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? " ▲" : " ▼";
    }
    return " ";
  };

  const sortedData = [...data]
    .sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      return 0;
    })
    .filter((item) =>
      String(item[searchField] ?? "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
    );

  return { sortedData, handleSort, sortSymbol, searchQuery, setSearchQuery };
}

/**
 * Format an hours value for display.
 * Handles both plain-text hours ("8:30 am - 5:30 pm M-F") and
 * JSON-structured hours ({"monday":{"closed":false,"open":"09:00","close":"17:00"},...}).
 */
export function formatHours(hours) {
  if (!hours) return "N/A";
  try {
    const parsed = typeof hours === "string" ? JSON.parse(hours) : hours;
    if (typeof parsed !== "object" || parsed === null) return hours;

    const dayOrder = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    const dayAbbr = {
      monday: "Mon",
      tuesday: "Tue",
      wednesday: "Wed",
      thursday: "Thu",
      friday: "Fri",
      saturday: "Sat",
      sunday: "Sun",
    };

    const formatTime = (t) => {
      if (!t) return "";
      const [h, m] = t.split(":");
      const hour = parseInt(h, 10);
      const period = hour >= 12 ? "PM" : "AM";
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${hour12}:${m} ${period}`;
    };

    return dayOrder
      .filter((day) => parsed[day])
      .map((day) => {
        const d = parsed[day];
        if (d.closed) return `${dayAbbr[day]}: Closed`;
        return `${dayAbbr[day]}: ${formatTime(d.open)} - ${formatTime(d.close)}`;
      })
      .join("\n");
  } catch {
    // Not valid JSON — return as-is (plain text hours)
    return hours;
  }
}

export const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];
