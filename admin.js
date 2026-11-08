const { isOwner, normalizeChannel } = require("./utils");
const { addChannel, removeChannel, listChannels, findChannelByUsername, setMonitoring } = require("./channels");
const { addPanel, getAllPanels, removePanel } = require("./panels");
const { assignService, listServices, removeService } = require("./services");
const { getReport } = require("./reports");

function helpText() {
  return [
    "OWNER COMMANDS",
    "/myid",
    "/addchannel @username",
    "/removechannel @username",
    "/channels",
    "/startqty @username  (starts channel post monitoring)",
    "/stopqty @username   (stops channel post monitoring)",
    "/getqty @username    (shows monitoring and service mapping status)",
    "/newpanel Name | https://provider.example/api | API_KEY",
    "/allpanellist",
    "/removepanel PANEL_ID",
    "/channelservice @username PANEL_ID SERVICE_ID",
    "/allservicelist",
    "/channelservicelist",
    "/serviceremove @username",
    "/reportday [@username]",
    "/report24 [@username]",
    "/report72 [@username]",
    "/reportweek [@username]",
    "/reportmonth [@username]",
    "/qtyhelp",
    "",
    "Note: This build monitors channel posts and reports activity. It does not place paid views, likes, reactions, or other artificial-engagement orders."
  ].join("\\n");
}

function parseCommand(text) {
  const match = text.match(/^\\/(\\w+)(?:@\\w+)?(?:\\s+([\\s\\S]*))?$/);
  return match ? { command: match[1].toLowerCase(), args: (match[2] || "").trim() } : null;
}

async function handleAdminMessage(bot, msg) {
  const text = msg.text || "";
  const parsed = parseCommand(text);
  if (!parsed) return false;

  const { command, args } = parsed;
  const chatId = msg.chat.id;
  const reply = value => bot.sendMessage(chatId, value);

  if (command === "myid") {
    await reply(`Your Telegram ID: ${msg.from.id}`);
    return true;
  }

  if (!isOwner(msg.from.id)) {
    await reply("⛔ This command is restricted to the owner admin.");
    return true;
  }

  try {
    if (["start", "qtyhelp", "help"].includes(command)) {
      await reply(helpText());
    } else if (command === "addchannel") {
      const username = normalizeChannel(args);
      if (!username) throw new Error("Usage: /addchannel @public_channel");
      const chat = await bot.getChat(`@${username}`);
      const me = await bot.getMe();
      const member = await bot.getChatMember(chat.id, me.id);
      if (!["administrator", "creator"].includes(member.status)) {
        throw new Error("Please add the bot as an administrator in that channel first.");
      }
      const added = addChannel(chat);
      await reply(`✅ Channel registered: ${added.title} (@${added.username})\\nPost monitoring is ON.`);
    } else if (command === "removechannel") {
      if (!removeChannel(args)) throw new Error("Channel not found. Use /channels.");
      await reply("✅ Channel and its service mapping removed.");
    } else if (command === "channels") {
      const channels = listChannels();
      await reply(channels.length ? channels.map((c, i) =>
        `${i + 1}. ${c.title} (@${c.username}) — ${c.monitoring ? "🟢 Monitoring ON" : "🔴 Monitoring OFF"}`
      ).join("\\n") : "No channels registered yet.");
    } else if (command === "startqty" || command === "stopqty") {
      if (!args) throw new Error(`Usage: /${command} @username`);
      const updated = setMonitoring(args, command === "startqty");
      await reply(`✅ @${updated.username} post monitoring ${updated.monitoring ? "enabled" : "disabled"}.`);
    } else if (command === "getqty") {
      const channel = findChannelByUsername(args);
      if (!channel) throw new Error("Channel not found.");
      const mapping = listServices().find(s => s.channelId === channel.id);
      await reply(
        `Channel: @${channel.username}\\nMonitoring: ${channel.monitoring ? "ON" : "OFF"}\\n` +
        `Provider: ${mapping?.panelName || "Not mapped"}\\nService reference: ${mapping?.serviceId || "Not mapped"}\\n` +
        "Paid engagement quantity/order automation is not enabled in this build."
      );
    } else if (command === "newpanel") {
      const parts = args.split("|").map(s => s.trim());
      if (parts.length !== 3) throw new Error("Usage: /newpanel Name | https://provider.example/api | API_KEY");
      const panel = addPanel(parts[0], parts[1], parts[2]);
      await reply(`✅ Provider saved.\\nName: ${panel.name}\\nID: ${panel.id}\\nAPI key is encrypted and will not be displayed.`);
    } else if (command === "allpanellist") {
      const panels = getAllPanels();
      await reply(panels.length ? panels.map((p, i) => `${i + 1}. ${p.name}\\nID: ${p.id}\\nURL: ${p.apiUrl}`).join("\\n\\n") : "No providers saved.");
    } else if (command === "removepanel") {
      if (!args) throw new Error("Usage: /removepanel PANEL_ID");
      if (!removePanel(args)) throw new Error("Provider ID not found.");
      await reply("✅ Provider removed.");
    } else if (command === "channelservice") {
      const parts = args.split(/\\s+/);
      if (parts.length !== 3) throw new Error("Usage: /channelservice @username PANEL_ID SERVICE_ID");
      const mapping = assignService(parts[0], parts[1], parts[2]);
      await reply(`✅ Service reference mapped to @${mapping.channelUsername}. No order will be submitted.`);
    } else if (command === "allservicelist" || command === "channelservicelist") {
      const mappings = listServices();
      await reply(mappings.length ? mappings.map((m, i) =>
        `${i + 1}. @${m.channelUsername}\\nProvider: ${m.panelName}\\nService: ${m.serviceId}`
      ).join("\\n\\n") : "No service mappings configured.");
    } else if (command === "serviceremove") {
      if (!removeService(args)) throw new Error("No service mapping found for this channel.");
      await reply("✅ Service mapping removed.");
    } else if (["reportday", "report24", "report72", "reportweek", "reportmonth"].includes(command)) {
      const hours = { report24: 24, report72: 72, reportweek: 168, reportmonth: 720 }[command] || null;
      const today = command === "reportday";
      const username = args ? normalizeChannel(args) : null;
      if (args && !username) throw new Error("Use a public channel username, e.g. /report24 @channel");
      const report = getReport({ hours, today, channelUsername: username });
      await reply(
        `📊 ${command.toUpperCase()}\\nScope: ${report.channel}\\n` +
        `Detected channel posts: ${report.postsDetected}\\nFrom: ${report.from}\\nTo: ${report.to}\\n` +
        "These are post-detection metrics, not paid SMM order-delivery metrics."
      );
    } else {
      await reply("Unknown command. Send /qtyhelp for the command list.");
    }
  } catch (error) {
    await reply(`⚠️ ${error.message}`);
  }
  return true;
}

module.exports = { handleAdminMessage, helpText };
