const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { CONFIG } = require("./config");

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "bot-data.json");

let store = null;

function encryptionKey() {
    return crypto.scryptSync(CONFIG.BOT_TOKEN, "telegram-bot-panel-v1", 32);
}

function encryptSecret(secret) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
        "aes-256-gcm",
        encryptionKey(),
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(String(secret), "utf8"),
        cipher.final()
    ]);

    return {
        iv: iv.toString("hex"),
        tag: cipher.getAuthTag().toString("hex"),
        data: encrypted.toString("hex")
    };
}

function decryptSecret(encrypted) {
    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        encryptionKey(),
        Buffer.from(encrypted.iv, "hex")
    );

    decipher.setAuthTag(Buffer.from(encrypted.tag, "hex"));

    return Buffer.concat([
        decipher.update(Buffer.from(encrypted.data, "hex")),
        decipher.final()
    ]).toString("utf8");
}

function defaultStore() {
    return {
        version: 1,
        panels: [],
        channels: [],
        reports: [],
        createdAt: new Date().toISOString()
    };
}

async function writeStore() {
    await fs.mkdir(DATA_DIR, { recursive: true });

    const tempFile = DATA_FILE + ".tmp";

    await fs.writeFile(
        tempFile,
        JSON.stringify(store, null, 2),
        "utf8"
    );

    await fs.rename(tempFile, DATA_FILE);
}

async function initializeStorage() {
    await fs.mkdir(DATA_DIR, { recursive: true });

    try {
        const content = await fs.readFile(DATA_FILE, "utf8");
        store = JSON.parse(content);

        if (
            !store ||
            !Array.isArray(store.panels) ||
            !Array.isArray(store.channels) ||
            !Array.isArray(store.reports)
        ) {
            throw new Error("Invalid storage structure");
        }
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }

        store = defaultStore();

        // Existing Railway API_KEY becomes the initial panel.
        if (CONFIG.API_KEY) {
            store.panels.push({
                id: crypto.randomUUID(),
                name: "SMMULITE",
                url: "https://smmlite.com/api/v2",
                apiKey: encryptSecret(CONFIG.API_KEY),
                status: "ON",
                createdAt: new Date().toISOString()
            });
        }

        await writeStore();
    }

    return store;
}

function getStore() {
    if (!store) {
        throw new Error("Storage is not initialized");
    }

    return store;
}

async function addPanel(name, url, apiKey) {
    const data = getStore();

    if (!name || !apiKey) {
        throw new Error("Panel name and API key are required");
    }

    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== "https:") {
        throw new Error("Panel URL must use HTTPS");
    }

    const existing = data.panels.find(
        panel => panel.name.toLowerCase() === name.toLowerCase()
    );

    if (existing) {
        throw new Error("Panel name already exists");
    }

    const panel = {
        id: crypto.randomUUID(),
        name: name.trim(),
        url: parsedUrl.toString(),
        apiKey: encryptSecret(apiKey),
        status: "ON",
        createdAt: new Date().toISOString()
    };

    data.panels.push(panel);
    await writeStore();

    return {
        id: panel.id,
        name: panel.name,
        url: panel.url,
        status: panel.status
    };
}

function listPanels() {
    return getStore().panels.map(panel => ({
        id: panel.id,
        name: panel.name,
        url: panel.url,
        status: panel.status
    }));
}

function getPanelCredentials(panelId) {
    const panel = getStore().panels.find(
        item => item.id === panelId
    );

    if (!panel) {
        throw new Error("Panel not found");
    }

    return {
        name: panel.name,
        url: panel.url,
        apiKey: decryptSecret(panel.apiKey)
    };
}

async function removePanel(panelId) {
    const data = getStore();

    data.panels = data.panels.filter(
        panel => panel.id !== panelId
    );

    await writeStore();
}

async function addChannel(username) {
    const data = getStore();
    const name = username.replace(/^@/, "").toLowerCase();

    if (!name) {
        throw new Error("Invalid channel username");
    }

    if (data.channels.some(ch => ch.username === name)) {
        throw new Error("Channel already exists");
    }

    const channel = {
        id: crypto.randomUUID(),
        username: name,
        quantity: 0,
        status: "ON",
        service: null,
        createdAt: new Date().toISOString()
    };

    data.channels.push(channel);
    await writeStore();

    return channel;
}

async function removeChannel(username) {
    const data = getStore();
    const name = username.replace(/^@/, "").toLowerCase();

    data.channels = data.channels.filter(
        ch => ch.username !== name
    );

    await writeStore();
}

async function setChannelService(username, panelId, serviceId) {
    const data = getStore();
    const name = username.replace(/^@/, "").toLowerCase();

    const channel = data.channels.find(
        ch => ch.username === name
    );

    if (!channel) {
        throw new Error("Channel not found");
    }

    const panel = data.panels.find(
        p => p.id === panelId
    );

    if (!panel) {
        throw new Error("Panel not found");
    }

    if (!/^[0-9]+$/.test(String(serviceId))) {
        throw new Error("Invalid service ID");
    }

    channel.service = {
        panelId,
        serviceId: String(serviceId),
        updatedAt: new Date().toISOString()
    };

    await writeStore();
    return channel;
}

async function removeChannelService(username) {
    const data = getStore();
    const name = username.replace(/^@/, "").toLowerCase();

    const channel = data.channels.find(
        ch => ch.username === name
    );

    if (!channel) {
        throw new Error("Channel not found");
    }

    channel.service = null;
    await writeStore();
}

async function recordReport(entry) {
    const data = getStore();

    data.reports.push({
        ...entry,
        recordedAt: new Date().toISOString()
    });

    // Keep the latest 10,000 records.
    if (data.reports.length > 10000) {
        data.reports = data.reports.slice(-10000);
    }

    await writeStore();
}

module.exports = {
    initializeStorage,
    getStore,
    addPanel,
    listPanels,
    getPanelCredentials,
    removePanel,
    addChannel,
    removeChannel,
    setChannelService,
    removeChannelService,
    recordReport
};
