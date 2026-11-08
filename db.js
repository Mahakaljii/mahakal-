const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const db = require('./db');

console.log('Bot Initialization Started...');

const token = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID;

if (!token) {
    console.error('CRITICAL: BOT_TOKEN is missing in environment variables');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
console.log('Bot Started Successfully and Polling...');

// User State management for multi-step prompts (like adding panels or services)
let userStates = {};
let processedLogs = [];

// Helper Function: Check Admin Permission
function isOwner(msg) {
    if (!OWNER_ID) return false;
    return msg.from.id.toString() === OWNER_ID.toString();
}

// 📌 /myid - Check Telegram Numeric ID
bot.onText(/\/myid/, (msg) => {
    bot.sendMessage(msg.chat.id, 👤 Aapki Telegram ID: <code>${msg.from.id}</code>, { parse_mode: 'HTML' });
});

// 📌 /qtyhelp - Show all operational admin commands
bot.onText(/\/qtyhelp/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Aap is bot ke admin nahi hain.");
    
    const helpText = 🛠️ **ADMIN COMMANDS CONTROLS**\n\n +
        🔹 **/addchannel @channel** - New channel add karein\n +
        🔹 **/removechannel @channel** - Channel remove karein\n +
        🔹 **/setqty @channel 500** - Fixed quantity set karein\n +
        🔹 **/getqty @channel** - Channel status & current qty\n +
        🔹 **/startqty @channel** - Channel status ON\n +
        🔹 **/stopqty @channel** - Channel status OFF\n +
        🔹 **/channels** - View all channels and configurations\n\n +
        📊 **REPORTS ENGINE**\n +
        🔹 /reportday [@channel] - Today's log\n +
        🔹 /report24 [@channel] - Past 24 Hours\n +
        🔹 /report72 [@channel] - Past 72 Hours\n +
        🔹 /reportweek [@channel] - Past 7 Days\n +
        🔹 /reportmonth [@channel] - Past 30 Days\n\n +
        💳 **PANEL MANAGEMENT**\n +
        🔹 /NEWPANEL - Setup dynamic new SMM Panel\n +
        🔹 /Allpanellist - View active integrated panels\n +
        🔹 /Removepanel - Drop a specific panel configuration\n\n +
        ⚙️ **SERVICE NUMBER CONTROLS**\n +
        🔹 /CHANNELSERVICE - Set panel service ID for channel/group\n +
        🔹 /allservicelist - List all globally active panel services\n +
        🔹 /Channelservicelist - List service maps on active channels\n +
        🔹 /Serviceremove - Remove panel service routing from channel;

    bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
});

// ==========================================
// 🛠️ CHANNEL CONFIG MANAGEMENT COMMANDS
// ==========================================

bot.onText(/\/addchannel\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    let channel = match[1].trim().toLowerCase();
    if (!channel.startsWith('@')) channel = '@' + channel;

    try {
        await db.run(INSERT INTO channels (username) VALUES (?), [channel]);
        bot.sendMessage(msg.chat.id, ✅ Channel **${channel}** successfully add ho gaya! Default setup SMMILITE aur Service 5160 par active hai., { parse_mode: 'Markdown' });
    } catch (e) {
        bot.sendMessage(msg.chat.id, ⚠️ Channel ${channel} pehle se added ho sakta hai ya database error hai.);
    }
});

bot.onText(/\/removechannel\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    let channel = match[1].trim().toLowerCase();
    if (!channel.startsWith('@')) channel = '@' + channel;

    await db.run(DELETE FROM channels WHERE username = ?, [channel]);
    bot.sendMessage(msg.chat.id, 🗑️ Channel **${channel}** config database se permanently hataya gaya., { parse_mode: 'Markdown' });
});

bot.onText(/\/setqty\s+(\S+)\s+(\d+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    let channel = match[1].trim().toLowerCase();
    let qty = parseInt(match[2]);
    if (!channel.startsWith('@')) channel = '@' + channel;

    const row = await db.get(SELECT * FROM channels WHERE username = ?, [channel]);
    if (!row) return bot.sendMessage(msg.chat.id, ❌ Channel database mein missing hai. Pehle /addchannel use karein.);

    await db.run(UPDATE channels SET quantity = ? WHERE username = ?, [qty, channel]);
    bot.sendMessage(msg.chat.id, 🔢 Fixed quantity update: **${channel}** ➡️ **${qty}** orders., { parse_mode: 'Markdown' });
});

bot.onText(/\/getqty\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    let channel = match[1].trim().toLowerCase();
    if (!channel.startsWith('@')) channel = '@' + channel;

    const row = await db.get(SELECT * FROM channels WHERE username = ?, [channel]);
    if (!row) return bot.sendMessage(msg.chat.id, ❌ Channel configuration not found.);

    const res = 📢 **Channel Status System**\n\n📌 Target: ${row.username}\n📊 Mode status: ${row.status === 'ON' ? '🟢 ON' : '🔴 OFF'}\n🔢 Quantity Configured: ${row.quantity}\n📦 Router Panel: ${row.panel_name}\n⚙️ Service Reference ID: ${row.service_number};
    bot.sendMessage(msg.chat.id, res);
});

bot.onText(/\/startqty\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    let channel = match[1].trim().toLowerCase();
    if (!channel.startsWith('@')) channel = '@' + channel;

    await db.run(UPDATE channels SET status = 'ON' WHERE username = ?, [channel]);
    bot.sendMessage(msg.chat.id, 🟢 Automation active for **${channel}**., { parse_mode: 'Markdown' });
});

bot.onText(/\/stopqty\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    let channel = match[1].trim().toLowerCase();
    if (!channel.startsWith('@')) channel = '@' + channel;

    await db.run(UPDATE channels SET status = 'OFF' WHERE username = ?, [channel]);
    bot.sendMessage(msg.chat.id, 🔴 Automation disabled/stopped for **${channel}**., { parse_mode: 'Markdown' });
});

bot.onText(/\/channels/, async (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const rows = await db.all(SELECT * FROM channels);
    if (rows.length === 0) return bot.sendMessage(msg.chat.id, "📁 Database khali hai.");

    let out = 📋 **ALL REGISTERED CHANNELS**\n\n;
    rows.forEach(r => {
        out += ${r.status === 'ON' ? '🟢' : '🔴'} **${r.username}** | Qty: ${r.quantity} | Panel: ${r.panel_name} [ID: ${r.service_number}]\n;
    });
    bot.sendMessage(msg.chat.id, out, { parse_mode: 'Markdown' });
});
