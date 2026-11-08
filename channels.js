const { getAll, saveAll } = require("./storage");
const { generateId, normalizeChannel } = require("./utils");

function findChannelByUsername(input) {
  const username = normalizeChannel(input);
  if (!username) return null;
  return getAll("CHANNELS").find(c => c.username === username) || null;
}

function addChannel(chat) {
  if (!chat || !chat.id || !chat.username) {
    throw new Error("Only public channels with a username can be registered using this command.");
  }
  const channels = getAll("CHANNELS");
  if (channels.some(c => String(c.chatId) === String(chat.id))) throw new Error("Channel is already registered.");
  const channel = {
    id: generateId(), chatId: String(chat.id), username: chat.username.toLowerCase(),
    title: chat.title || chat.username, monitoring: true, createdAt: new Date().toISOString()
  };
  channels.push(channel);
  saveAll("CHANNELS", channels);
  return channel;
}

function removeChannel(input) {
  const channel = findChannelByUsername(input);
  if (!channel) return false;
  saveAll("CHANNELS", getAll("CHANNELS").filter(c => c.id !== channel.id));
  saveAll("SERVICES", getAll("SERVICES").filter(s => s.channelId !== channel.id));
  return true;
}

function listChannels() {
  return getAll("CHANNELS");
}

function setMonitoring(input, enabled) {
  const channel = findChannelByUsername(input);
  if (!channel) throw new Error("Channel not found. Use /channels to check registered channels.");
  const channels = getAll("CHANNELS");
  const index = channels.findIndex(c => c.id === channel.id);
  channels[index].monitoring = Boolean(enabled);
  channels[index].updatedAt = new Date().toISOString();
  saveAll("CHANNELS", channels);
  return channels[index];
}

module.exports = { addChannel, removeChannel, listChannels, findChannelByUsername, setMonitoring };
