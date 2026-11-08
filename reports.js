const { getStore } = require("./storage");

const REPORT_PERIODS = {
    report24: {
        label: "Last 24 Hours",
        milliseconds: 24 * 60 * 60 * 1000
    },
    report72: {
        label: "Last 72 Hours",
        milliseconds: 72 * 60 * 60 * 1000
    },
    reportday: {
        label: "Today",
        today: true
    },
    reportweek: {
        label: "Last 7 Days",
        milliseconds: 7 * 24 * 60 * 60 * 1000
    },
    reportmonth: {
        label: "Last 30 Days",
        milliseconds: 30 * 24 * 60 * 60 * 1000
    }
};

function getStartTime(period) {
    const now = new Date();

    if (period.today) {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        return start;
    }

    return new Date(Date.now() - period.milliseconds);
}

function registerReportCommands(bot, isOwner) {

    for (const [command, period] of Object.entries(REPORT_PERIODS)) {

        const regex = new RegExp(
            ^\\/${command}(?:@\\w+)?(?:\\s+(@?[a-zA-Z0-9_]{5,32}))?$,
            "i"
        );

        bot.onText(regex, async (msg, match) => {

            if (
                msg.chat.type !== "private" ||
                !msg.from ||
                !isOwner(msg.from.id)
            ) {
                return bot.sendMessage(
                    msg.chat.id,
                    "Access denied. Owner private chat only."
                );
            }

            try {
                const data = getStore();

                const startTime = getStartTime(period);
                const channelFilter = match[1]
                    ? match[1].replace(/^@/, "").toLowerCase()
                    : null;

                let channels = data.channels;

                if (channelFilter) {
                    channels = channels.filter(
                        ch => ch.username === channelFilter
                    );

                    if (!channels.length) {
                        return bot.sendMessage(
                            msg.chat.id,
                            Channel not found: @${channelFilter}
                        );
                    }
                }

                const channelIds = new Set(
                    channels.map(ch => ch.username)
                );

                const records = data.reports.filter(record => {
                    const date = new Date(record.recordedAt);

                    return (
                        Number.isFinite(date.getTime()) &&
                        date >= startTime &&
                        channelIds.has(record.channel)
                    );
                });

                const detected = records.reduce(
                    (sum, r) => sum + (Number(r.detectedPosts) || 0),
                    0
                );

                const successful = records.reduce(
                    (sum, r) => sum + (Number(r.successful) || 0),
                    0
                );

                const failed = records.reduce(
                    (sum, r) => sum + (Number(r.failed) || 0),
                    0
                );

                const target = channels.reduce(
                    (sum, ch) => sum + (Number(ch.quantity) || 0),
                    0
                );

                const active = channels.filter(
                    ch => ch.status === "ON"
                ).length;

                const stopped = channels.length - active;

                const title = channelFilter
                    ? CHANNEL REPORT: @${channelFilter}
                    : "OVERALL CHANNEL REPORT";

                const report =
                    📊 ${title}\n\n +
                    Period: ${period.label}\n +
                    From: ${startTime.toLocaleString("en-IN")}\n\n +
                    Registered Channels: ${channels.length}\n +
                    Active Channels: ${active}\n +
                    Stopped Channels: ${stopped}\n\n +
                    Detected Posts: ${detected}\n +
                    Successful Operations: ${successful}\n +
                    Failed Operations: ${failed}\n\n +
                    Configured Quantity Targets: ${target}\n\n +
                    Report generated: ${new Date().toLocaleString("en-IN")};

                return bot.sendMessage(msg.chat.id, report);

            } catch (error) {
                console.error("Report Error:", error);

                return bot.sendMessage(
                    msg.chat.id,
                    "Unable to generate report."
                );
            }
        });
    }
}

module.exports = {
    registerReportCommands
};
