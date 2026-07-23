const { db, hasFirebaseConfig } = require("../config/firebase");
const crypto = require("crypto");

const SESSION_TTL_MS = 4 * 60 * 60 * 1000;

// Canonical max-length limits — source of truth for services and redteam-eval tests; don't redefine locally.
const MAX_USER_MESSAGE_CHARS = 500;
const MAX_REASON_CHARS = 1200;
// Declared separately from MAX_USER_MESSAGE_CHARS so it can be tuned independently and imported by tests.
const MAX_ACTION_TAKEN_CHARS = 500;

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getDbOrThrow() {
  if (!hasFirebaseConfig || !db) {
    throw createHttpError(503, "Database is not configured");
  }

  return db;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  );
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix) {
  const randomId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${randomId}`;
}

function parseLimit(value, fallback = 50, max = 200) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function stripControlChars(value) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

function truncateText(value, maxLength = 500) {
  const text = stripControlChars(value);
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

function normalizeBoundedText(value, options = {}) {
  const { maxLength = 500, trim = true } = options;
  const text = trim ? stripControlChars(value).trim() : stripControlChars(value);
  return truncateText(text, maxLength);
}

function validateBoundedText(value, fieldName, options = {}) {
  const { maxLength = 500, required = true } = options;
  if (typeof value !== "string") {
    if (!required && value == null) {
      return "";
    }
    throw createHttpError(400, `${fieldName} must be a string`);
  }

  const text = stripControlChars(value).trim();
  if (required && !text) {
    throw createHttpError(400, `${fieldName} is required`);
  }
  if (text.length > maxLength) {
    throw createHttpError(400, `${fieldName} must be ${maxLength} characters or fewer`);
  }

  return text;
}

function maskSensitiveText(value) {
  let text = stripControlChars(value);

  text = text.replace(/\b[STFGM]\d{7}[A-Z]\b/gi, "[NRIC]");
  text = text.replace(/\b(?:\+?65[\s-]?)?[689]\d{3}[\s-]?\d{4}\b/g, "[PHONE]");
  text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]");
  text = text.replace(/\b(?:\d[ -]*?){13,19}\b/g, "[CARD_NUMBER]");
  text = text.replace(/\b\d{6}\b/g, "[POSTAL_CODE]");
  text = text.replace(
    /\b(my address is|address:|i live at|send it to)\s+[^.\n]{5,120}/gi,
    "$1 [ADDRESS]"
  );

  return text;
}

function sanitizePersistedText(value, options = {}) {
  const { maxLength = 500, trim = true } = options;
  return normalizeBoundedText(maskSensitiveText(value), { maxLength, trim });
}

module.exports = {
  cleanObject,
  clone,
  createHttpError,
  createId,
  getDbOrThrow,
  isPlainObject,
  maskSensitiveText,
  normalizeBoundedText,
  parseLimit,
  sanitizePersistedText,
  stripControlChars,
  truncateText,
  validateBoundedText,
  SESSION_TTL_MS,
  MAX_USER_MESSAGE_CHARS,
  MAX_REASON_CHARS,
  MAX_ACTION_TAKEN_CHARS,
};
