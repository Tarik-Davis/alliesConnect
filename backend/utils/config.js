/**
 * Shared configuration constants and helpers for backend API routes.
 */

const saltRounds = 10;

const getFrontendUrl = () => {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(":5000", ":3000");
  }
  return "http://localhost:3000";
};

module.exports = { saltRounds, getFrontendUrl };
