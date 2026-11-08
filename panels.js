"use strict";

const {
    addPanel,
    listPanels,
    removePanel
} = require("./storage");

const pendingPanels = new Map();

function registerPanelCommands(bot, isOwner) {

    if (typeof isOwner !== "function") {
        throw new Error("Panel module requires owner authorization.");
    }

    // Owner security
    function authorized(msg) {
        return (
            msg.chat &&
            msg.chat.type === "private" &&
            msg.from &&
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
                const parsedUrl = new URL(url);

                if (parsedUrl.protocol !== "https:") {
                    throw new Error("HTTPS URL required.");
                }

            } catch (error) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Invalid panel URL."
                );
            }

            const key = String(msg.from.id);

            pendingPanels.set(key, {
                name,
                url,
                createdAt: Date.now()
            });

            return bot.sendMessage(
                msg.chat.id,
                'Panel: ${name}'
URL: ${url}

Now send the API key in your next private message.

Do not share it in groups.
            );
        }
    );

    // RECEIVE PANEL API KEY
    bot.on("message", async (msg) => {

        if (!msg.from || !msg.text) return;
        if (msg.text.startsWith("/")) return;
        if (msg.chat.type !== "private") return;
        if (!isOwner(msg.from.id)) return;

        const key = String(msg.from.id);
        const pending = pendingPanels.get(key);

        if (!pending) return;

        // Expire setup after 5 minutes
        if (Date.now() - pending.createdAt > 5 * 60 * 1000) {

            pendingPanels.delete(key);

            return bot.sendMessage(
                msg.chat.id,
                "Panel setup expired. Please use /addpanel again."
            );
        }

        const apiKey = msg.text.trim();

        if (apiKey.length < 5 || apiKey.length > 500) {
            return bot.sendMessage(
                msg.chat.id,
                "Invalid API key. Please send a valid key."
            );
        }

        // Clear pending state
        pendingPanels.delete(key);

        // Best effort: delete message containing API key
        try {
            await bot.deleteMessage(
                msg.chat.id,
                msg.message_id
            );
        } catch (error) {
            console.warn("Could not delete API key message.");
        }

        try {
            const panel = await addPanel(
                pending.name,
                pending.url,
                apiKey
            );

            return bot.sendMessage(
                msg.chat.id,
                Panel successfully added.

Name: ${panel.name}
URL: ${panel.url}
Status: ${panel.status}

API key: Stored securely (hidden).
            );

        } catch (error) {

            console.error("Panel creation error:", error);

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
                    "Access denied. Owner private chat only."
                );
            }

            try {
                const panels = listPanels();

                if (!panels.length) {
                    return bot.sendMessage(
                        msg.chat.id,
                        "No SMM panels registered."
                    );
                }

                const output = panels.map((panel, index) => (
                    ${index + 1}. ${panel.name}\n +
                    URL: ${panel.url}\n +
                    Status: ${panel.status}\n +
                    ID: ${panel.id}
                ));

                return bot.sendMessage(
                    msg.chat.id,
                    "REGISTERED SMM PANELS\n\n" +
                    output.join("\n\n"),
                    { disable_web_page_preview: true }
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
                    "Access denied. Owner private chat only."
                );
            }

            const name = match[1].trim().toLowerCase();

            try {
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
                    "Access denied. Owner private chat only."
                );
            }

            const name = match[1].trim().toLowerCase();

            try {
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
                console.error("Panel removal error:", error);

                return bot.sendMessage(
                    msg.chat.id,
                    Error: ${error.message}
                );
            }
        }
    );

    console.log("Panel commands registered.");
}

module.exports = {
    registerPanelCommands
};
