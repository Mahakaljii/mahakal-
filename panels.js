const crypto = require("crypto");
const { getAll, saveAll } = require("./storage");
const { generateId } = require("./utils");

const STORAGE_TYPE = "PANELS";

// Encryption key must be configured in Railway
function getEncryptionKey() {
    const secret = process.env.PANEL_ENCRYPTION_KEY;

    if (!secret || secret.length < 32) {
        throw new Error(
            "PANEL_ENCRYPTION_KEY must be at least 32 characters"
        );
    }

    return crypto.scryptSync(
        secret,
        "smm-provider-encryption-v1",
        32
    );
}

// Encrypt API credentials
function encrypt(value) {
    const iv = crypto.randomBytes(12);
    const key = getEncryptionKey();

    const cipher = crypto.createCipheriv(
        "aes-256-gcm",
        key,
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(value, "utf8"),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return {
        iv: iv.toString("hex"),
        data: encrypted.toString("hex"),
        tag: authTag.toString("hex")
    };
}

// Decrypt API credentials
function decrypt(payload) {
    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(payload.iv, "hex")
    );

    decipher.setAuthTag(
        Buffer.from(payload.tag, "hex")
    );

    return Buffer.concat([
        decipher.update(Buffer.from(payload.data, "hex")),
        decipher.final()
    ]).toString("utf8");
}

// Validate provider URL
function validatePanelUrl(value) {
    try {
        const url = new URL(value);

        return (
            url.protocol === "https:" &&
            Boolean(url.hostname)
        );
    } catch {
        return false;
    }
}

// Add new provider
function addPanel(name, apiUrl, apiKey) {
    if (!name  !apiUrl  !apiKey) {
        throw new Error("Name, URL and API key are required");
    }

    if (!validatePanelUrl(apiUrl)) {
        throw new Error("A valid HTTPS provider URL is required");
    }

    const panels = getAll(STORAGE_TYPE);

    const normalizedName = name.trim().toLowerCase();

    if (panels.some(
        panel => panel.name.toLowerCase() === normalizedName
    )) {
        throw new Error("Provider name already exists");
    }

    const record = {
        id: generateId(),
        name: name.trim(),
        apiUrl: apiUrl.trim().replace(/\/+$/, ""),
        credentials: encrypt(apiKey),
        status: "configured",
        createdAt: new Date().toISOString()
    };

    panels.push(record);

    if (!saveAll(STORAGE_TYPE, panels)) {
        throw new Error("Could not save provider configuration");
    }

    return {
        id: record.id,
        name: record.name,
        apiUrl: record.apiUrl,
        status: record.status
    };
}

// List providers without exposing credentials
function getAllPanels() {
    return getAll(STORAGE_TYPE).map(panel => ({
        id: panel.id,
        name: panel.name,
        apiUrl: panel.apiUrl,
        status: panel.status,
        createdAt: panel.createdAt
    }));
}

// Get one provider's decrypted credentials
function getPanelCredentials(panelId) {
    const panels = getAll(STORAGE_TYPE);

    const panel = panels.find(
        item => item.id === panelId
    );

    if (!panel) {
        throw new Error("Provider not found");
    }

    return {
        id: panel.id,
        name: panel.name,
        apiUrl: panel.apiUrl,
        apiKey: decrypt(panel.credentials)
    };
}

// Update provider information
function updatePanel(panelId, updates) {
    const panels = getAll(STORAGE_TYPE);

    const index = panels.findIndex(
        panel => panel.id === panelId
    );

    if (index === -1) {
        throw new Error("Provider not found");
    }

    const panel = panels[index];

    if (updates.name) {
        panel.name = updates.name.trim();
    }

    if (updates.apiUrl) {
        if (!validatePanelUrl(updates.apiUrl)) {
            throw new Error("Invalid HTTPS provider URL");
        }

        panel.apiUrl = updates.apiUrl.trim().replace(/\/+$/, "");
    }

    if (updates.apiKey) {
        panel.credentials = encrypt(updates.apiKey);
    }

    panel.updatedAt = new Date().toISOString();

    if (!saveAll(STORAGE_TYPE, panels)) {
        throw new Error("Provider update failed");
    }

    return {
        id: panel.id,
        name: panel.name,
        apiUrl: panel.apiUrl,
        status: panel.status
    };
}

// Remove provider
function removePanel(panelId) {
    const panels = getAll(STORAGE_TYPE);

    const filtered = panels.filter(
        panel => panel.id !== panelId
    );

    if (filtered.length === panels.length) {
        return false;
    }

    return saveAll(STORAGE_TYPE, filtered);
}

module.exports = {
    addPanel,
    getAllPanels,
    getPanelCredentials,
    updatePanel,
    removePanel
};
