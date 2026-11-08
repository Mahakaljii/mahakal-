const TelegramBot = require("node-telegram-bot-api");
const { BOT_TOKEN } = require("./config");
const { handleAdminMessage } = require("./admin");
const { getAll } = require("./storage");
const { recordChannelPost } = require("./reports");

const bot = new TelegramBot(BOT_TOKEN, {
  polling: {
    autoStart: true,
    params: { allowed_updates: ["message", "channel_post"] }
  }
});

bot.on("message", async msg => {
  try {
    await handleAdminMessage(bot, msg);
  } catch (error) {
    console.error("Message handler error:", error);
  }
});

bot.on("channel_post", async post => {
  try {
    const channel = getAll("CHANNELS").find(c => String(c.chatId) === String(post.chat.id));
    if (!channel || !channel.monitoring) return;

    const isNew = recordChannelPost(post);
    if (isNew) {
      console.log(`Detected new post: @${channel.username}/${post.message_id}`);
    }
  } catch (error) {
    console.error("Channel post handler error:", error);
  }
});

bot.on("polling_error", error => {
  console.error("Telegram polling error:", error.message);
});

bot.getMe()
  .then(me => console.log(`Bot started: @${me.username}`))
  .catch(error => console.error("Bot startup check failed:", error.message));

async function shutdown(signal) {
  console.log(`${signal} received. Stopping bot...`);
  try {
    await bot.stopPolling();
  } catch (error) {
    console.error("Polling shutdown error:", error.message);
  }
  process.exit(0);
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
