const { getAll, addRecord, saveAll } = require("./storage");
const { getStartOfDayIST } = require("./utils");

function recordChannelPost(post) {
  const key = `${post.chat.id}:${post.message_id}`;
  const processed = getAll("PROCESSED_POSTS");
  if (processed.some(p => p.key === key)) return false;

  processed.push({ key, chatId: String(post.chat.id), messageId: post.message_id, processedAt: new Date().toISOString() });
  if (processed.length > 20000) processed.splice(0, processed.length - 20000);
  saveAll("PROCESSED_POSTS", processed);

  addRecord("EVENTS", {
    id: key, type: "channel_post_detected", chatId: String(post.chat.id),
    messageId: post.message_id, date: new Date((post.date || Math.floor(Date.now() / 1000)) * 1000).toISOString()
  });
  return true;
}

function getReport({ hours = null, channelUsername = null, today = false } = {}) {
  const channels = getAll("CHANNELS");
  const channel = channelUsername
    ? channels.find(c => c.username === channelUsername.replace(/^@/, "").toLowerCase())
    : null;
  const now = Date.now();
  const start = today ? getStartOfDayIST().getTime() : (hours ? now - hours * 3600000 : 0);
  const events = getAll("EVENTS").filter(e =>
    e.type === "channel_post_detected" &&
    new Date(e.date).getTime() >= start &&
    (!channel || e.chatId === channel.chatId)
  );
  return {
    channel: channel ? `@${channel.username}` : "All registered channels",
    postsDetected: events.length,
    from: start ? new Date(start).toISOString() : "All recorded history",
    to: new Date(now).toISOString()
  };
}

module.exports = { recordChannelPost, getReport };
