function normalizeChannelUsername(value) {
  if (typeof value !== "string") {
    return null;
  }

  let username = value.trim();

  username = username.replace(/^https?:\/\/(www\.)?t\.me\//i, "");
  username = username.replace(/^@/, "");
  username = username.split(/[/?#]/)[0];

  if (!/^[a-zA-Z0-9_]{5,32}$/.test(username)) {
    return null;
  }

  return @${username};
}

function isValidServiceId(value) {
  return /^\d+$/.test(String(value).trim());
}

function isValidQuantity(value) {
  const quantity = Number(value);

  return (
    Number.isSafeInteger(quantity) &&
    quantity > 0
  );
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = {
  normalizeChannelUsername,
  isValidServiceId,
  isValidQuantity,
  formatDate,
  formatNumber,
  escapeHtml
};
