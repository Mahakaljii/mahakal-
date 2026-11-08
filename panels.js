GOD TRADERS:
"use strict";

const {
    addPanel,
    listPanels,
    removePanel
} = require("./storage");

const pendingPanels = new Map();

function registerPanelCommands(bot, isOwner) {

    // OWNER SECURITY
    function checkOwner(msg) {
        if (!msg  !msg.from  !msg.chat) {
            return false;
        }

        if (msg.chat.type !== "private") {
            return false;
        }

        if (typeof isOwner !== "function") {
            return false;
        }

        return isOwner(msg.from.id);
    }

    // ADD PANEL
    bot.onText(
        /^\/addpanel(?:@\w+)?\s+(\S+)\s+(https:\/\/\S+)$/i,
        async function (msg, match) {

            if (!checkOwner(msg)) {
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
                    throw new Error("HTTPS URL is required.");
                }

                const ownerId = String(msg.from.id);

                pendingPanels.set(ownerId, {
                    name: name,
                    url: parsedUrl.toString(),
                    createdAt: Date.now()
                });

                const message =
                    "PANEL SETUP STARTED\n\n" +
                    "Panel Name: " + name + "\n" +
                    "Panel URL: " + url + "\n\n" +
                    "Now send your SMM Panel API Key " +
                    "in your next private message.\n\n" +
                    "Your API key will be stored encrypted.\n" +
                    "Setup expires in 5 minutes.\n\n" +
                    "Use /cancelpanel to cancel.";

                return bot.sendMessage(msg.chat.id, message);

            } catch (error) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Panel setup error: " + error.message
                );
            }
        }
    );

    // CANCEL PANEL SETUP
    bot.onText(
        /^\/cancelpanel(?:@\w+)?$/i,
        async function (msg) {

            if (!checkOwner(msg)) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Access denied."
                );
            }

            pendingPanels.delete(String(msg.from.id));

            return bot.sendMessage(
                msg.chat.id,
                "Panel setup cancelled successfully."
            );
        }
    );

    // RECEIVE API KEY
    bot.on("message", async function (msg) {

        if (!msg  !msg.from  !msg.text) {
            return;
        }

        if (!checkOwner(msg)) {
            return;
        }

        if (msg.text.startsWith("/")) {
            return;
        }

        const ownerId = String(msg.from.id);
        const pending = pendingPanels.get(ownerId);

        if (!pending) {
            return;
        }

        if (Date.now() - pending.createdAt > 300000) {

            pendingPanels.delete(ownerId);

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

        // Prevent duplicate submission.
        pendingPanels.delete(ownerId);

        try {

            const panel = await addPanel(
                pending.name,
                pending.url,
                apiKey
            );

            // Delete API key message.
            try {
                await bot.deleteMessage(
                    msg.chat.id,
                    msg.message_id
                );
            } catch (deleteError) {
                console.log(
                    "API key message deletion failed."
                );
            }

            const successMessage =
                "PANEL ADDED SUCCESSFULLY\n\n" +
                "Name: " + panel.name + "\n" +
                "URL: " + panel.url + "\n" +
                "Status: " + panel.status + "\n\n" +
                "API Key: Encrypted and hidden.";

            return bot.sendMessage(
                msg.chat.id,
                successMessage
            );

        } catch (error) {

            console.error("Panel save error:", error);

            return bot.sendMessage(
                msg.chat.id,
                "Panel could not be added: " +
                error.message
            );
        }
    });

    // LIST PANELS
    bot.onText(
        /^\/panels(?:@\w+)?$/i,
        async function (msg) {

            if (!checkOwner(msg)) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Access denied."
                );
            }

            try {

                const panels = listPanels();

                if (!panels || panels.length === 0) {
                    return bot.sendMessage(
                        msg.chat.id,
                        "No SMM panels registered."
                    );
                }

                let output = "REGISTERED SMM PANELS\n\n";

                panels.forEach(function (panel, index) {

                    output +=
                        (index + 1) + ". " +
                        panel.name + "\n" +
                        "URL: " + panel.url + "\n" +
                        "Status: " + panel.status + "\n" +
                        "ID: " + panel.id + "\n\n";
                });

                return bot.sendMessage(
                    msg.chat.id,
                    output
                );

            } catch (error) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Panel list error: " + error.message
                );
            }
        }
    );

    // GET PANEL DETAILS
    bot.onText(
        /^\/getpanel(?:@\w+)?\s+(.+)$/i,
        async function (msg, match) {

            if (!checkOwner(msg)) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Access denied."
                );
            }

            try {

                const name = match[1].trim().toLowerCase();

                const panel = listPanels().find(
                    function (item) {
                        return item.name.toLowerCase() === name;
                    }
                );

                if (!panel) {
                    return bot.sendMessage(
                        msg.chat.id,
                        "Panel not found."
                    );
                }

                const details =
                    "PANEL DETAILS\n\n" +
                    "Name: " + panel.name + "\n" +
                    "URL: " + panel.url + "\n" +
                    "Status: " + panel.status + "\n" +
                    "ID: " + panel.id + "\n" +
                    "API Key: Hidden";

                return bot.sendMessage(
                    msg.chat.id,
                    details
                );

            } catch (error) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Panel details error: " + error.message
                );
            }
        }
    );

    // REMOVE PANEL
    bot.onText(
        /^\/removepanel(?:@\w+)?\s+(.+)$/i,
        async function (msg, match) {

            if (!checkOwner(msg)) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Access denied."
                );
            }

            try {

                const name = match[1].trim().toLowerCase();

                const panel = listPanels().find(
                    function (item) {
                        return item.name.toLowerCase() === name;
                    }
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
                    "Panel removed successfully: " +
                    panel.name
                );

            } catch (error) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Panel removal error: " + error.message
                );
            }
        }
    );

}

module.exports = {
    registerPanelCommands: registerPanelCommands
};
