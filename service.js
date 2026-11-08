"use strict";

const {
    getStore,
    listPanels,
    setChannelService,
    removeChannelService
} = require("./storage");

function registerServiceCommands(bot, isOwner) {

    if (typeof isOwner !== "function") {
        throw new Error("Service module requires an owner authorization function.");
    }

    // Owner security check
    function authorized(msg) {
        return (
            msg.chat &&
            msg.chat.type === "private" &&
            msg.from &&
            isOwner(msg.from.id)
        );
    }

    // SET CHANNEL SERVICE
    bot.onText(
        /^\/channelservice(?:@\w+)?\s+(@?[a-zA-Z0-9_]{5,32})\s+([a-zA-Z0-9_-]+)\s+(\d+)$/i,
        async (msg, match) => {

            if (!authorized(msg)) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Access denied. Owner private chat only."
                );
            }

            const username = match[1].replace(/^@/, "");
            const panelName = match[2];
            const serviceId = match[3];

            try {
                const panel = listPanels().find(
                    p => p.name.toLowerCase() === panelName.toLowerCase()
                );

                if (!panel) {
                    return bot.sendMessage(
                        msg.chat.id,
                        Panel not found: ${panelName}\nUse /panels to see registered panels.
                    );
                }

                const channel = await setChannelService(
                    username,
                    panel.id,
                    serviceId
                );

                return bot.sendMessage(
                    msg.chat.id,
                    CHANNEL SERVICE CONFIGURED

Channel: @${channel.username}
Panel: ${panel.name}
Service ID: ${serviceId}
Channel Status: ${channel.status}

Configuration saved successfully.
                );

            } catch (error) {
                console.error("Channel service configuration error:", error);

                return bot.sendMessage(
                    msg.chat.id,
                    Service configuration failed:\n${error.message}
                );
            }
        }
    );

    // ALL CHANNEL SERVICES
    bot.onText(
        /^\/allchannelservice(?:@\w+)?$/i,
        async (msg) => {

            if (!authorized(msg)) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Access denied. Owner private chat only."
                );
            }

            try {
                const data = getStore();
                const panels = listPanels();

                if (!data.channels || !data.channels.length) {
                    return bot.sendMessage(
                        msg.chat.id,
                        "No channels registered."
                    );
                }

                const output = data.channels.map((channel, index) => {

                    let panelName = "Unknown panel";
                    let serviceId = "Not configured";

                    if (channel.service) {
                        const panel = panels.find(
                            p => p.id === channel.service.panelId
                        );

                        panelName = panel
                            ? panel.name
                            : "Panel removed";

                        serviceId = channel.service.serviceId;
                    }

                    return (
                        ${index + 1}. @${channel.username}\n +
                        Panel: ${panelName}\n +
                        Service ID: ${serviceId}\n +
                        Quantity Target: ${channel.quantity}\n +
                        Channel Status: ${channel.status}
                    );
                });

                return bot.sendMessage(
                    msg.chat.id,
                    "ALL CHANNEL SERVICE CONFIGURATIONS\n\n" +
                    output.join("\n\n"),
                    { disable_web_page_preview: true }
                );

            } catch (error) {
                console.error("Channel service listing error:", error);

                return bot.sendMessage(
                    msg.chat.id,
                    Error: ${error.message}
                );
            }
        }
    );

    // REMOVE CHANNEL SERVICE
    bot.onText(
        /^\/removechannelservice(?:@\w+)?\s+(@?[a-zA-Z0-9_]{5,32})$/i,
        async (msg, match) => {

            if (!authorized(msg)) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Access denied. Owner private chat only."
                );
            }

            try {
                const username = match[1].replace(/^@/, "");

                await removeChannelService(username);

                return bot.sendMessage(
                    msg.chat.id,
                    Channel service configuration removed.

Channel: @${username}

Channel itself has NOT been deleted.
                );

            } catch (error) {
                console.error("Channel service removal error:", error);

                return bot.sendMessage(
                    msg.chat.id,
                    Removal failed:\n${error.message}
                );
            }
        }
    );

    console.log("Service commands registered.");
}

module.exports = {
    registerServiceCommands
};
