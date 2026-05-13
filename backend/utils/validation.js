/**
 * Shared validation and normalization utilities for backend API routes.
 * Import from here instead of redefining locally in each api file.
 */

const isValidEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhoneFormat = (phone) => {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(String(phone || "").replace(/\D/g, ""));
};

const isValidPasswordFormat = (password) => {
  const hasMinLength = password.length > 6;
  const hasCapitalLetter = /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`]/.test(password);
  const hasNoSpaces = !/\s/.test(password);
  return hasMinLength && hasCapitalLetter && hasSpecialChar && hasNoSpaces;
};

const isValidUsernameFormat = (username) => {
  const hasValidLength = username.length >= 3 && username.length <= 50;
  const hasValidChars = /^[a-zA-Z0-9_-]+$/.test(username);
  const hasNoSpaces = !/\s/.test(username);
  return hasValidLength && hasValidChars && hasNoSpaces;
};

const isValidEINFormat = (ein) => {
  const einRegex = /^\d{2}-\d{7}$/;
  return einRegex.test(ein);
};

const normalizeEin = (einValue) => {
  const digits = String(einValue || "").replace(/\D/g, "");
  if (digits.length !== 9) return "";
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
};

module.exports = {
  isValidEmailFormat,
  isValidPhoneFormat,
  isValidPasswordFormat,
  isValidUsernameFormat,
  isValidEINFormat,
  normalizeEin,
};
