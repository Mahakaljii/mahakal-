const {
    addPanel,
    listPanels,
    removePanel
} = require("./storage");

const pendingPanels = new Map();

function registerPanelCommands(bot, isOwner) {

    // ADD PANEL
    bot.onText(/^\/addpanel(?:@\w+)?\s+(\S+)\s+(https:\/\/\S+)$/i,
        async (msg, match) => {

            if (msg.chat.type !== "private") {
                return bot.sendMessage(
                    msg.chat.id,
                    "Security: Please add panels through private bot chat."
                );
            }

            if (!isOwner(msg.from.id)) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Access denied. Owner only."
                );
            }

            const name = match[1].trim();
            const url = match[2].trim();

            try {
                new URL(url);
            } catch {
                return bot.sendMessage(msg.chat.id, "Invalid panel URL.");
            }

            const key = ${msg.from.id};

            pendingPanels.set(key, {
                name,
                url,
                createdAt: Date.now()
            });

            await bot.sendMessage(
                msg.chat.id,
                Panel: ${name}\nURL: ${url}\n\nNow send the API key in your next private message.\n\nDo not share it in groups.
            );
        }
    );

    // RECEIVE PANEL API KEY
    bot.on("message", async (msg) => {

        if (!msg.from || !msg.text) return;
        if (msg.text.startsWith("/")) return;
        if (msg.chat.type !== "private") return;
        if (!isOwner(msg.from.id)) return;

        const key = ${msg.from.id};
        const pending = pendingPanels.get(key);

        if (!pending) return;

        // Expire unfinished setup after 5 minutes.
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

        // Remove pending state before saving.
        pendingPanels.delete(key);

        try {
            const panel = await addPanel(
                pending.name,
                pending.url,
                apiKey
            );

            // Best effort: remove the message containing the key.
            try {
                await bot.deleteMessage(
                    msg.chat.id,
                    msg.message_id
                );
            } catch {
                // Telegram may not permit deleting this message.
            }

            await bot.sendMessage(
                msg.chat.id,
                Panel successfully added.\n\n +
                Name: ${panel.name}\n +
                URL: ${panel.url}\n +
                Status: ${panel.status}\n\n +
                API key: Stored securely (hidden).
            );

        } catch (error) {
            await bot.sendMessage(
                msg.chat.id,
                Panel could not be added: ${error.message}
            );
        }
    });

    // LIST PANELS
    bot.onText(/^\/panels(?:@\w+)?$/i, async (msg) => {

        if (!isOwner(msg.from.id)) {
            return bot.sendMessage(msg.chat.id, "Access denied.");
        }

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
            "REGISTERED SMM PANELS\n\n" + output.join("\n\n")
        );
    });

    // GET PANEL DETAILS
    bot.onText(/^\/getpanel(?:@\w+)?\s+(.+)$/i,
        async (msg, match) => {

            if (!isOwner(msg.from.id)) {
                return bot.sendMessage(msg.chat.id, "Access denied.");
            }

            const name = match[1].trim().toLowerCase();
            const panel = listPanels().find(
                item => item.name.toLowerCase() === name
            );

            if (!panel) {
                return bot.sendMessage(msg.chat.id, "Panel not found.");
            }

            return bot.sendMessage(
                msg.chat.id,
                PANEL DETAILS\n\n +
                Name: ${panel.name}\n +
                URL: ${panel.url}\n +
                Status: ${panel.status}\n +
                ID: ${panel.id}\n +
                API Key: Hidden
            );
        }
    );

    // REMOVE PANEL
    bot.onText(/^\/removepanel(?:@\w+)?\s+(.+)$/i,
        async (msg, match) => {

            if (!isOwner(msg.from.id)) {
                return bot.sendMessage(msg.chat.id, "Access denied.");
            }

            const name = match[1].trim().toLowerCase();

            const panel = listPanels().find(
                item => item.name.toLowerCase() === name
            );

            if (!panel) {
                return bot.sendMessage(msg.chat.id, "Panel not found.");
            }

            try {
                await removePanel(panel.id);

                return bot.sendMessage(
                    msg.chat.id,
                    Panel removed successfully: ${panel.name}
                );

            } catch (error) {
                return bot.sendMessage(
                    msg.chat.id,
                    Error: ${error.message}
                );
            }
        }
    );
}

module.exports = {
    registerPanelCommands
};
