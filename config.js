require("dotenv").config();
const fs = require("fs");
const path = require("path");

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = Number(process.env.OWNER_ID);
const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");

if (!BOT_TOKEN) throw new Error("BOT_TOKEN is missing.");
if (!Number.isSafeInteger(OWNER_ID) || OWNER_ID <= 0) {
  throw new Error("OWNER_ID must be a valid positive Telegram numeric ID.");
}

fs.mkdirSync(DATA_DIR, { recursive: true });

const FILES = Object.freeze({
  CHANNELS: path.join(DATA_DIR, "channels.json"),
  PANELS: path.join(DATA_DIR, "panels.json"),
  SERVICES: path.join(DATA_DIR, "services.json"),
  PROCESSED_POSTS: path.join(DATA_DIR, "processed_posts.json"),
  EVENTS: path.join(DATA_DIR, "events.json")
});

for (const file of Object.values(FILES)) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]\n", { flag: "wx" });
}

module.exports = { BOT_TOKEN, OWNER_ID, DATA_DIR, FILES };
