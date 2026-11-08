
const {
  isOwner,
  normalizeChannel
} = require("./utils");

const {
  addChannel,
  removeChannel,
  listChannels,
  findChannelByUsername,
  setMonitoring
} = require("./channels");

const {
  addPanel,
  getAllPanels,
  removePanel
} = require("./panels");

const {
  assignService,
  listServices,
  removeService
} = require("./services");

const {
  getReport
} = require("./reports");


/**
 * OWNER HELP COMMANDS
 */

function helpText() {
  return [
    "🚀 TELEGRAM SMM MANAGEMENT BOT",
    "",
    "1. CHANNEL RULES & MONITORING",
    "",
    "/addchannel @username",
    "/removechannel @username",
    "/setqty @username number",
    "/getqty @username",
    "/startqty @username",
    "/stopqty @username",
    "/channels",
    "",
    "2. PANEL MANAGEMENT",
    "",
    "/newpanel Name | https://panel.example/api | API_KEY",
    "/allpanellist",
    "/removepanel PANEL_ID",
    "",
    "3. CHANNEL SERVICE MAPPING",
    "",
    "/channelservice @username PANEL_ID SERVICE_ID",
    "/allservicelist",
    "/channelservicelist",
    "/serviceremove @username",
    "",
    "4. REPORTS",
    "",
    "/reportday [@username]",
    "/report24 [@username]",
    "/report72 [@username]",
    "/reportweek [@username]",
    "/reportmonth [@username]",
    "",
    "5. UTILITIES",
    "",
    "/myid",
    "/qtyhelp",
    "",
    "Note: This build supports channel-post monitoring, configuration records and activity reports. It does not submit paid artificial views, likes, reactions or engagement orders."
  ].join("\n");
}


/**
 * TELEGRAM COMMAND PARSER
 */

function parseCommand(text) {

  if (typeof text !== "string") {
    return null;
  }

  const match = text.trim().match(
    /^\/([a-zA-Z0-9_]+)(?:@[a-zA-Z0-9_]+)?(?:\s+([\s\S]*))?$/
  );

  if (!match) {
    return null;
  }

  return {
    command: match[1].toLowerCase(),
    args: (match[2] || "").trim()
  };
}


/**
 * FORMAT CHANNEL LIST
 */

function formatChannelList(channels) {

  if (!Array.isArray(channels) || channels.length === 0) {
    return "No channels registered yet.";
  }

  return channels.map((channel, index) => {

    const title = channel.title || "Untitled channel";

    const username = channel.username
      ? @${channel.username}
      : "No public username";

    const status = channel.monitoring
      ? "🟢 Monitoring ON"
      : "🔴 Monitoring OFF";

    return ${index + 1}. ${title}\n${username}\n${status};

  }).join("\n\n");
}


/**
 * FORMAT PANEL LIST
 */

function formatPanelList(panels) {

  if (!Array.isArray(panels) || panels.length === 0) {
    return "No panels saved yet.";
  }

  return panels.map((panel, index) => {

    return [
      ${index + 1}. ${panel.name || "Unnamed panel"},
      ID: ${panel.id || "Not available"},
      URL: ${panel.apiUrl || "Not available"}
    ].join("\n");

  }).join("\n\n");
}


/**
 * FORMAT SERVICE LIST
 */

function formatServiceList(mappings) {

  if (!Array.isArray(mappings) || mappings.length === 0) {
    return "No service mappings configured.";
  }

  return mappings.map((mapping, index) => {

    return [
      ${index + 1}. @${mapping.channelUsername || "unknown"},
      Panel: ${mapping.panelName || "Not mapped"},
      Service ID: ${mapping.serviceId || "Not mapped"}
    ].join("\n");

  }).join("\n\n");
}


/**
 * MAIN ADMIN MESSAGE HANDLER
 */

async function handleAdminMessage(bot, msg) {

  if (!msg  !msg.chat  !msg.from) {
    return false;
  }

  const parsed = parseCommand(msg.text || "");

  if (!parsed) {
    return false;
  }

  const command = parsed.command;

  const args = parsed.args;

  const chatId = msg.chat.id;

  const reply = async (message) => {
    return bot.sendMessage(chatId, String(message));
  };


  /**
   * MY ID COMMAND
   */

  if (command === "myid") {

    await reply(
      Your Telegram ID: ${msg.from.id}
    );

    return true;
  }


  /**
   * OWNER SECURITY CHECK
   */

  if (!isOwner(msg.from.id)) {

    await reply(
      "⛔ This command is restricted to the owner admin."
    );

    return true;
  }


  try {

    switch (command) {


      /**
       * HELP COMMANDS
       */

      case "start":
      case "help":
      case "qtyhelp": {

        await reply(helpText());

        break;
      }


      /**
       * ADD CHANNEL
       */

      case "addchannel": {

        const username = normalizeChannel(args);

        if (!username) {
          throw new Error(
            "Usage: /addchannel @public_channel"
          );
        }

        const chat = await bot.getChat(@${username});

        const botInfo = await bot.getMe();

        const botMember = await bot.getChatMember(
          chat.id,
          botInfo.id
        );

        if (
          botMember.status !== "administrator" &&
          botMember.status !== "creator"
        ) {

          throw new Error(
            "Please add this bot as an administrator in the channel first."
          );
        }

        const addedChannel = addChannel(chat);

        await reply(
          ✅ Channel registered successfully.\n +
          Name: ${addedChannel.title || chat.title || "Untitled"}\n +
          Username: @${addedChannel.username || username}\n +
          "Post monitoring is enabled."
        );

        break;
      }


      /**
       * REMOVE CHANNEL
       */

      case "removechannel": {

        if (!args) {
          throw new Error(
            "Usage: /removechannel @username"
          );
        }

        const removed = removeChannel(args);

        if (!removed) {
          throw new Error(
            "Channel not found. Use /channels to view registered channels."
          );
        }

        await reply(
          "✅ Channel and its associated service mapping were removed."
        );

        break;
      }


      /**
       * CHANNEL LIST
       */

      case "channels": {

        const channels = listChannels();

        await reply(
          formatChannelList(channels)
        );

        break;
      }


      /**
       * SET QUANTITY
       */

      case "setqty": {

        const parts = args.split(/\s+/).filter(Boolean);

        if (parts.length !== 2) {

          throw new Error(
            "Usage: /setqty @username number"
          );
        }

        const username = normalizeChannel(parts[0]);

        const quantity = Number(parts[1]);

        if (
          !username ||
          !Number.isSafeInteger(quantity) ||
          quantity <= 0
        ) {

          throw new Error(
            "Please provide a valid public username and positive whole number."
          );
        }

        const channel = findChannelByUsername(username);

        if (!channel) {

          throw new Error(
            "Channel not found. Add it first using /addchannel."
          );
        }

        await reply(
          ℹ️ Quantity target received: ${quantity} for @${username}.\n +
          "This build records channel monitoring and service metadata only; it does not submit paid engagement orders."
        );

        break;
      }


      /**
       * START / STOP MONITORING
       */

      case "startqty":
      case "stopqty": {

        if (!args) {

          throw new Error(
            Usage: /${command} @username
          );
        }

        const updatedChannel = setMonitoring(
          args,
          command === "startqty"
        );

        await reply(
          ✅ Post monitoring for @${updatedChannel.username} is  +
          ${updatedChannel.monitoring ? "ON 🟢" : "OFF 🔴"}.
        );

        break;
      }


      /**
       * GET CHANNEL STATUS
       */

      case "getqty": {

        if (!args) {

          throw new Error(
            "Usage: /getqty @username"
          );
        }

        const channel = findChannelByUsername(args);

        if (!channel) {

          throw new Error(
            "Channel not found."
          );
        }

        const mapping = listServices().find(
          (service) => service.channelId === channel.id
        );

await reply(
          📌 CHANNEL DETAILS\n\n +
          Channel: @${channel.username}\n +
          Title: ${channel.title || "Not available"}\n +
          Monitoring: ${channel.monitoring ? "ON 🟢" : "OFF 🔴"}\n +
          Panel: ${mapping ? mapping.panelName : "Not mapped"}\n +
          Service ID: ${mapping ? mapping.serviceId : "Not mapped"}\n\n +
          "Paid engagement quantity/order automation is not enabled in this build."
        );

        break;
      }


      /**
       * ADD NEW PANEL
       */

      case "newpanel": {

        const parts = args.split("|").map(
          (part) => part.trim()
        );

        if (
          parts.length !== 3 ||
          !parts[0] ||
          !parts[1] ||
          !parts[2]
        ) {

          throw new Error(
            "Usage: /newpanel Name | https://panel.example/api | API_KEY"
          );
        }

        if (!/^https?:\/\//i.test(parts[1])) {

          throw new Error(
            "Panel API URL must begin with http:// or https://"
          );
        }

        const panel = addPanel(
          parts[0],
          parts[1],
          parts[2]
        );

        await reply(
          ✅ Panel configuration saved.\n +
          Name: ${panel.name}\n +
          ID: ${panel.id}\n +
          "The API key is not displayed in chat."
        );

        break;
      }


      /**
       * ALL PANEL LIST
       */

      case "allpanellist": {

        const panels = getAllPanels();

        await reply(
          formatPanelList(panels)
        );

        break;
      }


      /**
       * REMOVE PANEL
       */

      case "removepanel": {

        if (!args) {

          throw new Error(
            "Usage: /removepanel PANEL_ID"
          );
        }

        const removed = removePanel(args);

        if (!removed) {

          throw new Error(
            "Panel ID not found."
          );
        }

        await reply(
          "✅ Panel configuration removed."
        );

        break;
      }


      /**
       * CHANNEL SERVICE MAPPING
       */

      case "channelservice": {

        const parts = args.split(/\s+/).filter(Boolean);

        if (parts.length !== 3) {

          throw new Error(
            "Usage: /channelservice @username PANEL_ID SERVICE_ID"
          );
        }

        const username = normalizeChannel(parts[0]);

        if (!username) {

          throw new Error(
            "Please provide a valid public channel username."
          );
        }

        const mapping = assignService(
          username,
          parts[1],
          parts[2]
        );

        await reply(
          ✅ Service mapping saved for @${mapping.channelUsername}.\n +
          Panel: ${mapping.panelName}\n +
          Service ID: ${mapping.serviceId}\n\n +
          "This mapping is configuration metadata; no paid order is submitted."
        );

        break;
      }


      /**
       * ALL SERVICE LIST
       */

      case "allservicelist":
      case "channelservicelist": {

        const mappings = listServices();

        await reply(
          formatServiceList(mappings)
        );

        break;
      }


      /**
       * REMOVE SERVICE
       */

      case "serviceremove": {

        if (!args) {

          throw new Error(
            "Usage: /serviceremove @username"
          );
        }

        const removed = removeService(args);

        if (!removed) {

          throw new Error(
            "No service mapping found for this channel."
          );
        }

        await reply(
          "✅ Channel service mapping removed."
        );

        break;
      }


      /**
       * REPORTS SYSTEM
       */

      case "reportday":
      case "report24":
      case "report72":
      case "reportweek":
      case "reportmonth": {

        const reportHours = {

          report24: 24,

          report72: 72,

          reportweek: 24 * 7,

          reportmonth: 24 * 30

        };

        const hours = reportHours[command] || null;

        const today = command === "reportday";

        const username = args
          ? normalizeChannel(args)
          : null;

        if (args && !username) {

          throw new Error(
            "Use a public channel username, for example: /report24 @channel"
          );
        }

        const report = getReport({

          hours,

          today,

          channelUsername: username

        });

        await reply(
          📊 ${command.toUpperCase()} REPORT\n\n +
          Scope: ${report.channel || "All channels"}\n +
          Detected channel posts: ${report.postsDetected ?? 0}\n +
          From: ${report.from || "Not available"}\n +
          To: ${report.to || "Not available"}\n\n +
          "These figures represent detected channel posts, not paid SMM order-delivery metrics."
        );

        break;
      }


      /**
       * UNKNOWN COMMAND
       */

      default: {

        await reply(
          "Unknown command.\nSend /qtyhelp to see all available commands."
        );

        break;
      }

    }

  } catch (error) {

    console.error(
      Admin command error (/ ${command}):,
      error && error.stack ? error.stack : error
    );

    await reply(
      ⚠️ ${error.message || "An unexpected error occurred."}
    );

  }

  return true;
}


/**
 * EXPORT MODULES
 */

module.exports = {

  handleAdminMessage,

  helpText,

  parseCommand

};
