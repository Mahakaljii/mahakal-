const { CONFIG, isOwner } = require("./config");

function registerAdminCommands(bot) {

    // START COMMAND
    bot.onText(/^\/start(?:@\w+)?$/i, async (msg) => {

        const owner = isOwner(msg.from.id);

        const message = owner
            ? "Welcome Owner!\n\nYour Telegram Admin Bot is ready.\nUse /qtyhelp to see all commands."
            : "Welcome!\n\nThis bot is privately managed.";

        return bot.sendMessage(msg.chat.id, message);
    });

    // MY ID COMMAND
    bot.onText(/^\/myid(?:@\w+)?$/i, async (msg) => {

        return bot.sendMessage(
            msg.chat.id,
            Your Telegram ID: ${msg.from.id}
        );
    });

    // ADMIN COMMAND
    bot.onText(/^\/admin(?:@\w+)?$/i, async (msg) => {

        if (!isOwner(msg.from.id)) {
            return bot.sendMessage(
                msg.chat.id,
                "Access denied. Owner only."
            );
        }

        return bot.sendMessage(
            msg.chat.id,
            "OWNER CONTROL PANEL\n\n" +
            "Channel Management\n" +
            "/addchannel\n" +
            "/removechannel\n" +
            "/channels\n" +
            "/setqty\n" +
            "/getqty\n" +
            "/startqty\n" +
            "/stopqty\n\n" +

            "Panel Management\n" +
            "/addpanel\n" +
            "/panels\n" +
            "/getpanel\n" +
            "/removepanel\n\n" +

            "Service Management\n" +
            "/Channelservice\n" +
            "/Allchannelservice\n" +
            "/Removechannelservice\n\n" +

            "Reports\n" +
            "/report24\n" +
            "/report72\n" +
            "/reportday\n" +
            "/reportweek\n" +
            "/reportmonth\n\n" +

            "Use /qtyhelp for examples."
        );
    });

    // HELP COMMAND
    bot.onText(/^\/qtyhelp(?:@\w+)?$/i, async (msg) => {

        if (!isOwner(msg.from.id)) {
            return bot.sendMessage(
                msg.chat.id,
                "Access denied. Owner only."
            );
        }

        const help = 
🛠 OWNER ADMIN COMMANDS

CHANNEL MANAGEMENT

/addchannel @channel
/removechannel @channel
/channels

/setqty @channel 500
/getqty @channel
/startqty @channel
/stopqty @channel

PANEL MANAGEMENT

/addpanel PANEL_NAME https://example.com/api/v2
/panels
/getpanel PANEL_NAME
/removepanel PANEL_NAME

SERVICE MANAGEMENT

/Channelservice @channel PANEL_NAME SERVICE_ID
/Allchannelservice
/Removechannelservice @channel

REPORTS

/report24
/report72
/reportday
/reportweek
/reportmonth

SINGLE CHANNEL REPORTS

/report24 @channel
/report72 @channel
/reportday @channel
/reportweek @channel
/reportmonth @channel

GENERAL

/myid
/admin
/qtyhelp

OWNER ID: ${CONFIG.OWNER_ID}
;

        return bot.sendMessage(msg.chat.id, help);
    });
}

module.exports = {
    registerAdminCommands
};
