
const successMessage =
                    "PANEL ADDED SUCCESSFULLY\n\n" +
                    "Name: " + panel.name + "\n" +
                    "URL: " + panel.url + "\n" +
                    "Status: " + panel.status + "\n\n" +
                    "API Key: Stored securely.";

                return bot.sendMessage(
                    msg.chat.id,
                    successMessage
                );
            });
        })
        .catch(function (error) {

            console.error("Panel save error:", error);

            return bot.sendMessage(
                msg.chat.id,
                "Panel could not be added: " +
                error.message
            );
        });
    });

    // LIST PANELS
    bot.onText(
        /^\/panels(?:@\w+)?$/i,
        function (msg) {

            if (!authorized(msg)) {
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
        function (msg, match) {

            if (!authorized(msg)) {
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
        function (msg, match) {

            if (!authorized(msg)) {
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

                return removePanel(panel.id)
                    .then(function () {

                        return bot.sendMessage(
                            msg.chat.id,
                            "Panel removed successfully: " +
                            panel.name
                        );
                    })
                    .catch(function (error) {

                        return bot.sendMessage(
                            msg.chat.id,
                            "Panel removal failed: " +
                            error.message
                        );
                    });

            } catch (error) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Error: " + error.message
                );
            }
        }
    );

    console.log("Panel commands registered successfully.");
}

module.exports = {
    registerPanelCommands: registerPanelCommands
};
