const crypto = require("crypto");
const { OWNER_ID } = require("./config");

function generateId() {
  return crypto.randomUUID();
}

function isOwner(userId) {
  return Number(userId) === OWNER_ID;
}

function normalizeChannel(input) {
  if (typeof input !== "string") return null;
  let value = input.trim();
  value = value.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  value = value.replace(/^(t\.me|telegram\.me)\//i, "");
  value = value.split(/[?#]/)[0].replace(/\/+$/, "");
  if (value.includes("/") || value.startsWith("+") || value.startsWith("joinchat")) return null;
  value = value.replace(/^@/, "");
  return /^[a-zA-Z0-9_]{5,32}$/.test(value) ? value.toLowerCase() : null;
}

function formatDate(value = new Date()) {
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "medium"
  });
}

function getStartOfDayIST(now = new Date()) {
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  ist.setHours(0, 0, 0, 0);
  return new Date(ist.getTime() - (ist.getTimezoneOffset() * 60000));
}

function safeText(value, max = 300) {
  return String(value ?? "").replace(/[<>]/g, "").slice(0, max);
}

module.exports = { generateId, isOwner, normalizeChannel, formatDate, getStartOfDayIST, safeText };
