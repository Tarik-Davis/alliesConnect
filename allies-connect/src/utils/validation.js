export const isValidEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhoneFormat = (phone) => {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone.replace(/\D/g, ""));
};

export const isValidPasswordFormat = (password) => {
  const hasMinLength = password.length > 6;
  const hasCapitalLetter = /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`]/.test(password);
  const hasNoSpaces = !/\s/.test(password);
  return hasMinLength && hasCapitalLetter && hasSpecialChar && hasNoSpaces;
};

export const getPasswordErrors = (password) => {
  const errors = [];
  if (password.length <= 6) errors.push("Must be 7 characters or longer");
  if (!/[A-Z]/.test(password))
    errors.push("Must include at least one capital letter");
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/~`]/.test(password))
    errors.push(
      "Must include at least one special character (!@#$%^&*()_+-=[]{}|;:',.<>?/~`)",
    );
  if (/\s/.test(password)) errors.push("Cannot contain spaces");
  return errors;
};

export const isValidUsernameFormat = (username) => {
  const hasValidLength = username.length >= 3 && username.length <= 50;
  const hasValidChars = /^[a-zA-Z0-9_-]+$/.test(username);
  const hasNoSpaces = !/\s/.test(username);
  return hasValidLength && hasValidChars && hasNoSpaces;
};

export const isValidEINFormat = (ein) => {
  const einRegex = /^\d{2}-\d{7}$/;
  return einRegex.test(ein);
};

export const hasNineDigits = (ein) => {
  const digits = ein.replace(/\D/g, "");
  return digits.length === 9;
};

export const formatEIN = (value) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 9) return digits.slice(0, 2) + "-" + digits.slice(2);
  return digits.slice(0, 2) + "-" + digits.slice(2, 9);
};

export const formatPhone = (value) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

export const formatZip = (value) => {
  const digits = value.replace(/\D/g, "");
  return digits.slice(0, 5);
};
