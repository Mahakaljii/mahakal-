const crypto = require("crypto");
const { getAll, saveAll } = require("./storage");
const { generateId } = require("./utils");

function encryptionKey() {
  const secret = process.env.PANEL_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("Set PANEL_ENCRYPTION_KEY to a secret of at least 32 characters.");
  }
  return crypto.scryptSync(secret, "telegram-smm-management-provider-v1", 32);
}

function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return { iv: iv.toString("hex"), tag: cipher.getAuthTag().toString("hex"), data: ciphertext.toString("hex") };
}

function decryptSecret(payload) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(payload.iv, "hex"));
  decipher.setAuthTag(Buffer.from(payload.tag, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(payload.data, "hex")), decipher.final()]).toString("utf8");
}

function validateHttpsUrl(value) {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

function addPanel(name, apiUrl, apiKey) {
  if (!name?.trim() || !apiUrl?.trim() || !apiKey?.trim()) throw new Error("Name, HTTPS URL and API key are required.");
  if (!validateHttpsUrl(apiUrl)) throw new Error("Provider URL must use HTTPS.");
  const panels = getAll("PANELS");
  if (panels.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) throw new Error("A provider with this name already exists.");
  const panel = {
    id: generateId(), name: name.trim(), apiUrl: apiUrl.trim().replace(/\/+$/, ""),
    credentials: encryptSecret(apiKey.trim()), status: "configured", createdAt: new Date().toISOString()
  };
  panels.push(panel);
  saveAll("PANELS", panels);
  return publicPanel(panel);
}

function publicPanel(panel) {
  return { id: panel.id, name: panel.name, apiUrl: panel.apiUrl, status: panel.status, createdAt: panel.createdAt };
}

function getAllPanels() {
  return getAll("PANELS").map(publicPanel);
}

function getPanelCredentials(panelId) {
  const panel = getAll("PANELS").find(p => p.id === panelId);
  if (!panel) throw new Error("Provider not found.");
  return { ...publicPanel(panel), apiKey: decryptSecret(panel.credentials) };
}

function removePanel(panelId) {
  const panels = getAll("PANELS");
  if (!panels.some(p => p.id === panelId)) return false;
  // Prevent deleting a provider that is still referenced by a service mapping.
  const mapped = getAll("SERVICES").some(s => s.panelId === panelId);
  if (mapped) throw new Error("This provider is assigned to a channel service. Remove that mapping first.");
  saveAll("PANELS", panels.filter(p => p.id !== panelId));
  return true;
}

module.exports = { addPanel, getAllPanels, getPanelCredentials, removePanel };
