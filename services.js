const { getAll, saveAll } = require("./storage");
const { generateId } = require("./utils");
const { findChannelByUsername } = require("./channels");

function assignService(channelInput, panelId, serviceId) {
  const channel = findChannelByUsername(channelInput);
  if (!channel) throw new Error("Channel not found.");
  if (!getAll("PANELS").some(p => p.id === panelId)) throw new Error("Provider ID not found.");
  const cleanServiceId = String(serviceId || "").trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(cleanServiceId)) throw new Error("Invalid service reference.");
  const mappings = getAll("SERVICES");
  const existing = mappings.findIndex(m => m.channelId === channel.id);
  const mapping = {
    id: existing >= 0 ? mappings[existing].id : generateId(),
    channelId: channel.id, channelUsername: channel.username, panelId,
    serviceId: cleanServiceId, updatedAt: new Date().toISOString()
  };
  if (existing >= 0) mappings[existing] = mapping;
  else mappings.push(mapping);
  saveAll("SERVICES", mappings);
  return mapping;
}

function listServices() {
  const panels = getAll("PANELS");
  return getAll("SERVICES").map(m => ({
    ...m, panelName: panels.find(p => p.id === m.panelId)?.name || "Unknown provider"
  }));
}

function removeService(channelInput) {
  const channel = findChannelByUsername(channelInput);
  if (!channel) throw new Error("Channel not found.");
  const mappings = getAll("SERVICES");
  const next = mappings.filter(m => m.channelId !== channel.id);
  if (next.length === mappings.length) return false;
  saveAll("SERVICES", next);
  return true;
}

function getServiceForChannel(chatId) {
  const channel = getAll("CHANNELS").find(c => String(c.chatId) === String(chatId));
  if (!channel) return null;
  const mapping = getAll("SERVICES").find(m => m.channelId === channel.id);
  if (!mapping) return null;
  const panel = getAll("PANELS").find(p => p.id === mapping.panelId);
  return { ...mapping, panelName: panel?.name || "Unknown provider" };
}

module.exports = { assignService, listServices, removeService, getServiceForChannel };
