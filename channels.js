const {
    getStore,
    addChannel,
    removeChannel
} = require("./storage");

function registerChannelCommands(bot, isOwner) {

    // ADD CHANNEL
    bot.onText(/^\/addchannel(?:@\w+)?\s+(@?[a-zA-Z0-9_]{5,32})$/i,
        async (msg, match) => {

            if (!isOwner(msg.from.id)) {
                return bot.sendMessage(msg.chat.id, "Access denied.");
            }

            try {
                const channel = await addChannel(match[1]);

                return bot.sendMessage(
                    msg.chat.id,
                    Channel added successfully.\n\n +
                    Channel: @${channel.username}\n +
                    Quantity: ${channel.quantity}\n +
                    Status: ${channel.status}
                );

            } catch (error) {
                return bot.sendMessage(
                    msg.chat.id,
                    Error: ${error.message}
                );
            }
        }
    );

    // REMOVE CHANNEL
    bot.onText(/^\/removechannel(?:@\w+)?\s+(@?[a-zA-Z0-9_]{5,32})$/i,
        async (msg, match) => {

            if (!isOwner(msg.from.id)) {
                return bot.sendMessage(msg.chat.id, "Access denied.");
            }

            try {
                await removeChannel(match[1]);

                return bot.sendMessage(
                    msg.chat.id,
                    Channel removed: ${match[1]}
                );

            } catch (error) {
                return bot.sendMessage(
                    msg.chat.id,
                    Error: ${error.message}
                );
            }
        }
    );

    // LIST CHANNELS
    bot.onText(/^\/channels(?:@\w+)?$/i, async (msg) => {

        if (!isOwner(msg.from.id)) {
            return bot.sendMessage(msg.chat.id, "Access denied.");
        }

        const channels = getStore().channels;

        if (!channels.length) {
            return bot.sendMessage(msg.chat.id, "No channels added.");
        }

        const output = channels.map((ch, index) => {
            const service = ch.service
                ? ch.service.serviceId
                : "Not configured";

            return (
                ${index + 1}. @${ch.username}\n +
                Quantity: ${ch.quantity}\n +
                Service: ${service}\n +
                Status: ${ch.status}
            );
        });

        return bot.sendMessage(
            msg.chat.id,
            "CHANNEL MANAGEMENT\n\n" + output.join("\n\n")
        );
    });

    // SET QUANTITY TARGET
    bot.onText(/^\/setqty(?:@\w+)?\s+(@?[a-zA-Z0-9_]{5,32})\s+(\d+)$/i,
        async (msg, match) => {

            if (!isOwner(msg.from.id)) {
                return bot.sendMessage(msg.chat.id, "Access denied.");
            }

            const username = match[1].replace(/^@/, "").toLowerCase();
            const quantity = Number(match[2]);

            if (!Number.isSafeInteger(quantity)  quantity < 1  quantity > 1000000) {
                return bot.sendMessage(msg.chat.id, "Quantity must be between 1 and 1000000.");
            }

            const channel = getStore().channels.find(
                ch => ch.username === username
            );

            if (!channel) {
                return bot.sendMessage(msg.chat.id, "Channel not found.");
            }

            channel.quantity = quantity;

            const fs = require("fs/promises");
            const path = require("path");

            try {
                await saveChanges();
            } catch (error) {
                return bot.sendMessage(msg.chat.id, "Could not save quantity.");
            }

            return bot.sendMessage(
                msg.chat.id,
                Quantity target updated.\n\n +
                Channel: @${username}\n +
                Quantity: ${quantity}
            );
        }
    );

    // GET QUANTITY
    bot.onText(/^\/getqty(?:@\w+)?\s+(@?[a-zA-Z0-9_]{5,32})$/i,
        async (msg, match) => {

            if (!isOwner(msg.from.id)) {
                return bot.sendMessage(msg.chat.id, "Access denied.");
            }

            const username = match[1].replace(/^@/, "").toLowerCase();

            const channel = getStore().channels.find(
                ch => ch.username === username
            );

            if (!channel) {
                return bot.sendMessage(msg.chat.id, "Channel not found.");
            }

            return bot.sendMessage(
                msg.chat.id,
                CHANNEL STATUS\n\n +
                Channel: @${username}\n +
                Quantity: ${channel.quantity}\n +
                Status: ${channel.status}\n +
                Service: ${channel.service?.serviceId || "Not configured"}
            );
        }
    );

    // START CHANNEL
    bot.onText(/^\/startqty(?:@\w+)?\s+(@?[a-zA-Z0-9_]{5,32})$/i,
        async (msg, match) => {

            if (!isOwner(msg.from.id)) {
                return bot.sendMessage(msg.chat.id, "Access denied.");
            }

            const username = match[1].replace(/^@/, "").toLowerCase();

            const channel = getStore().channels.find(
                ch => ch.username === username
            );

            if (!channel) {
                return bot.sendMessage(msg.chat.id, "Channel not found.");
            }

            channel.status = "ON";
            await saveChanges();

            return bot.sendMessage(
                msg.chat.id,
                Channel ON: @${username}
            );
        }
    );

    // STOP CHANNEL
    bot.onText(/^\/stopqty(?:@\w+)?\s+(@?[a-zA-Z0-9_]{5,32})$/i,
        async (msg, match) => {

            if (!isOwner(msg.from.id)) {
                return bot.sendMessage(msg.chat.id, "Access denied.");
            }

            const username = match[1].replace(/^@/, "").toLowerCase();

            const channel = getStore().channels.find(
                ch => ch.username === username
            );

            if (!channel) {
                return bot.sendMessage(msg.chat.id, "Channel not found.");
            }

            channel.status = "OFF";
            await saveChanges();

            return bot.sendMessage(
                msg.chat.id,
                Channel OFF: @${username}
            );
        }
    );
}

// Storage persistence helper will be added to storage.js.
async function saveChanges() {
    const { saveStore } = require("./storage");
    await saveStore();
}

module.exports = {
    registerChannelCommands
};
