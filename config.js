require("dotenv").config();

const path = require("path");
const fs = require("fs");

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = Number(process.env.OWNER_ID);

// Storage directory
const DATA_DIR = process.env.DATA_DIR || "./data";

// Create data directory automatically
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// JSON database files
const FILES = {
    CHANNELS: path.join(DATA_DIR, "channels.json"),
    PANELS: path.join(DATA_DIR, "panels.json"),
    SERVICES: path.join(DATA_DIR, "services.json"),
    ORDERS: path.join(DATA_DIR, "orders.json"),
    PROCESSED_POSTS: path.join(DATA_DIR, "processed_posts.json")
};

// Validate environment variables
if (!BOT_TOKEN) {
    throw new Error("BOT_TOKEN is missing!");
}

if (!Number.isSafeInteger(OWNER_ID) || OWNER_ID <= 0) {
    throw new Error("Valid OWNER_ID is required!");
}

// Initialize JSON files
for (const file of Object.values(FILES)) {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify([], null, 2));
    }
}

module.exports = {
    BOT_TOKEN,
    OWNER_ID,
    DATA_DIR,
    FILES
};
