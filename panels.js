"use strict";

const {
    addPanel,
    listPanels,
    removePanel
} = require("./storage");

const pendingPanels = new Map();

function registerPanelCommands(bot, isOwner) {

    // OWNER SECURITY
    function authorized(msg) {
        return Boolean(
            msg &&
            msg.chat &&
            msg.chat.type === "private" &&
            msg.from &&
            typeof isOwner === "function" &&
            isOwner(msg.from.id)
        );
    }

    // ADD PANEL
    bot.onText(
        /^\/addpanel(?:@\w+)?\s+(\S+)\s+(https:\/\/\S+)$/i,
        async (msg, match) => {

            if (!authorized(msg)) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Access denied. Owner private chat only."
                );
            }

            const name = match[1].trim();
            const url = match[2].trim();

            try {
                const parsed = new URL(url);

                if (parsed.protocol !== "https:") {
                    throw new Error("HTTPS URL required.");
                }

                pendingPanels.set(String(msg.from.id), {
                    name,
                    url: parsed.toString(),
                    createdAt: Date.now()
                });

                return bot.sendMessage(
                    msg.chat.id,
                    PANEL SETUP

Panel Name: ${name}
Panel URL: ${url}

Now send your API key in the next private message.

Your API key will be stored encrypted.
Setup expires in 5 minutes.
                );

            } catch (error) {
                return bot.sendMessage(
                    msg.chat.id,
                    Panel setup failed: ${error.message}
                );
            }
        }
    );

    // RECEIVE API KEY
    bot.on("message", async (msg) => {

        if (!msg.from || !msg.text) return;
        if (msg.text.startsWith("/")) return;
        if (!authorized(msg)) return;

        const ownerKey = String(msg.from.id);
        const pending = pendingPanels.get(ownerKey);

        if (!pending) return;

        if (Date.now() - pending.createdAt > 5 * 60 * 1000) {

            pendingPanels.delete(ownerKey);

            return bot.sendMessage(
                msg.chat.id,
                "Setup expired. Please use /addpanel again."
            );
        }

        const apiKey = msg.text.trim();

        if (apiKey.length < 5 || apiKey.length > 500) {
            return bot.sendMessage(
                msg.chat.id,
                "Invalid API key. Please send a valid API key."
            );
        }

        pendingPanels.delete(ownerKey);

        try {
            const panel = await addPanel(
                pending.name,
                pending.url,
                apiKey
            );

            // Delete API key message for security.
            try {
                await bot.deleteMessage(
                    msg.chat.id,
                    msg.message_id
                );
            } catch (error) {
                console.error(
                    "Could not delete API key message:",
                    error.message
                );
            }

            return bot.sendMessage(
                msg.chat.id,
                PANEL ADDED SUCCESSFULLY

Name: ${panel.name}
URL: ${panel.url}
Status: ${panel.status}

API Key: Encrypted and hidden.
            );

        } catch (error) {
            return bot.sendMessage(
                msg.chat.id,
                Panel could not be added: ${error.message}
            );
        }
    });

    // LIST PANELS
    bot.onText(
        /^\/panels(?:@\w+)?$/i,
        async (msg) => {

            if (!authorized(msg)) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Access denied."
                );
            }

            try {
                const panels = listPanels();

                if (panels.length === 0) {
                    return bot.sendMessage(
                        msg.chat.id,
                        "No SMM panels registered."
                    );
                }

                const output = panels.map((panel, index) => {
                    return (
                        ${index + 1}. ${panel.name}\n +
                        URL: ${panel.url}\n +
                        Status: ${panel.status}\n +
                        ID: ${panel.id}
                    );
                });

                return bot.sendMessage(
                    msg.chat.id,
                    "REGISTERED SMM PANELS\n\n" +
                    output.join("\n\n")
                );

            } catch (error) {
                return bot.sendMessage(
                    msg.chat.id,
                    Error: ${error.message}
                );
            }
        }
    );

    // GET PANEL DETAILS
    bot.onText(
        /^\/getpanel(?:@\w+)?\s+(.+)$/i,
        async (msg, match) => {

            if (!authorized(msg)) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Access denied."
                );
            }

            try {
                const name = match[1].trim().toLowerCase();

                const panel = listPanels().find(
                    item => item.name.toLowerCase() === name
                );

                if (!panel) {
                    return bot.sendMessage(
                        msg.chat.id,
                        "Panel not found."
                    );
                }

                return bot.sendMessage(
                    msg.chat.id,
                    PANEL DETAILS

Name: ${panel.name}
URL: ${panel.url}
Status: ${panel.status}
ID: ${panel.id}
API Key: Hidden
                );

            } catch (error) {
                return bot.sendMessage(
                    msg.chat.id,
                    Error: ${error.message}
                );
            }
        }
    );

    // REMOVE PANEL
    bot.onText(
        /^\/removepanel(?:@\w+)?\s+(.+)$/i,
        async (msg, match) => {

            if (!authorized(msg)) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Access denied."
                );
            }

            try {
                const name = match[1].trim().toLowerCase();

                const panel = listPanels().find(
                    item => item.name.toLowerCase() === name
                );

                if (!panel) {
                    return bot.sendMessage(
                        msg.chat.id,
                        "Panel not found."
                    );
                }

                await removePanel(panel.id);

                return bot.sendMessage(
                    msg.chat.id,
                    Panel removed successfully: ${panel.name}
                );

            } catch (error) {
                return bot.sendMessage(
                    msg.chat.id,
                    Removal failed: ${error.message}
                );
            }
        }
    );

}

module.exports = {
    registerPanelCommands
};
