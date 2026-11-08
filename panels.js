𝙐𝙍𝙑𝙄 𝙂𝘼𝙈𝙀𝙍:
// DELETE API KEY MESSAGE
            try {
                await bot.deleteMessage(
                    msg.chat.id,
                    msg.message_id
                );
            } catch (error) {
                console.warn(
                    "Could not delete API key message."
                );
            }

            return bot.sendMessage(
                msg.chat.id,
                PANEL ADDED SUCCESSFULLY

Name: ${panel.name}
URL: ${panel.url}
Status: ${panel.status}

API Key: Stored securely (hidden).
            );

        } catch (error) {

            return bot.sendMessage(
                msg.chat.id,
                Panel could not be added.

Error: ${error.message}

Please try again or use /cancelpanel.
            );
        }
    });

    // LIST PANELS
    bot.onText(
        /^\/panels(?:@\w+)?$/i,
        async (msg) => {

            if (!isAuthorized(msg)) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Access denied."
                );
            }

            if (!isPrivate(msg)) {
                return;
            }

            try {

                const panels = listPanels();

                if (!panels.length) {
                    return bot.sendMessage(
                        msg.chat.id,
                        "No SMM panels registered."
                    );
                }

                const output = panels.map((panel, index) => {

                    return ${index + 1}. ${panel.name}
URL: ${panel.url}
Status: ${panel.status}
ID: ${panel.id};

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

            if (!isAuthorized(msg)) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Access denied."
                );
            }

            if (!isPrivate(msg)) {
                return;
            }

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
        }
    );

    // REMOVE PANEL
    bot.onText(
        /^\/removepanel(?:@\w+)?\s+(.+)$/i,
        async (msg, match) => {

            if (!isAuthorized(msg)) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Access denied."
                );
            }

            if (!isPrivate(msg)) {
                return;
            }

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
