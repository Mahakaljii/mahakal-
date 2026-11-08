const crypto = require("crypto");
const { OWNER_ID } = require("./config");

// Generate unique ID
function generateId() {
    return crypto.randomUUID();
}

// Check owner authorization
function isOwner(userId) {
    return Number(userId) === OWNER_ID;
}

// Clean channel username or link
function normalizeChannel(input) {
    if (!input || typeof input !== "string") {
        return null;
    }

    let value = input.trim();

    value = value.replace(/^https?:\/\//i, "");
    value = value.replace(/^www\./i, "");
    value = value.replace(/^t\.me\//i, "");
    value = value.replace(/^telegram\.me\//i, "");
    value = value.split(/[?#]/)[0];
    value = value.replace(/\/+$/, "");

    if (value.includes("/")) {
        return null;
    }

    value = value.replace(/^@/, "");

    if (!/^[a-zA-Z0-9_]{5,32}$/.test(value)) {
        return null;
    }

    return value.toLowerCase();
}

// Generate public Telegram post link
function generatePostLink(username, messageId) {
    const channel = normalizeChannel(username);

    if (!channel || !Number.isSafeInteger(Number(messageId))) {
        return null;
    }

    return https://t.me/${channel}/${Number(messageId)};
}

// Validate quantity
function validateQuantity(quantity) {
    const value = Number(quantity);

    return Number.isSafeInteger(value) && value > 0;
}

// Format date
function formatDate(date = new Date()) {
    return new Date(date).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "medium"
    });
}

// Calculate date range
function getDateRange(hours) {
    const end = new Date();
    const start = new Date(
        end.getTime() - Number(hours) * 60 * 60 * 1000
    );

    return { start, end };
}

// Safe error message
function getErrorMessage(error) {
    return error?.response?.data?.error ||
        error?.message ||
        "Unknown error";
}

module.exports = {
    generateId,
    isOwner,
    normalizeChannel,
    generatePostLink,
    validateQuantity,
    formatDate,
    getDateRange,
    getErrorMessage
};
