GOD TRADERS:
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const db = require('./db');
const { isOwner, extractUsername } = require('./helpers');

console.log('Bot Initialization Started...');
const token = process.env.BOT_TOKEN;

if (!token) {
    console.error('CRITICAL: BOT_TOKEN is missing in environment variables');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
console.log('Bot Engine Connected and Awaiting Orders...');

let userStates = {};
let processedLogs = [];

// Helper Command: /myid
bot.onText(/\/myid/, (msg) => {
    bot.sendMessage(msg.chat.id, 👤 Aapki Telegram ID: <code>${msg.from.id}</code>, { parse_mode: 'HTML' });
});

// Helper Command: /qtyhelp
bot.onText(/\/qtyhelp/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const helpText = 🛠️ **ADMIN CONTROLS**\n/addchannel [target]\n/removechannel [target]\n/setqty [target] [qty]\n/getqty [target]\n/startqty [target]\n/stopqty [target]\n/channels\n\n📊 **REPORTS ENGINE**\n/reportday [target]\n/report24 [target]\n/report72 [target]\n/reportweek [target]\n/reportmonth [target]\n\n💳 **PANELS**\n/NEWPANEL | /Allpanellist | /Removepanel\n\n⚙️ **SERVICES**\n/CHANNELSERVICE | /allservicelist | /Channelservicelist | /Serviceremove;
    bot.sendMessage(msg.chat.id, helpText);
});

// ==========================================
// 🛠️ ADMIN COMMAND HANDLERS
// ==========================================

bot.onText(/\/addchannel\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const target = extractUsername(match[1]);
    try {
        await db.run(INSERT INTO channels (username) VALUES (?), [target]);
        bot.sendMessage(msg.chat.id, ✅ Target **${target}** successfully add ho gaya!, { parse_mode: 'Markdown' });
    } catch (e) {
        bot.sendMessage(msg.chat.id, ⚠️ Target list mein pehle se ho sakta hai.);
    }
});

bot.onText(/\/removechannel\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const target = extractUsername(match[1]);
    await db.run(DELETE FROM channels WHERE username = ?, [target]);
    bot.sendMessage(msg.chat.id, 🗑️ Target **${target}** database se hataya gaya.);
});

bot.onText(/\/setqty\s+(\S+)\s+(\d+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const target = extractUsername(match[1]);
    const qty = parseInt(match[2]);
    await db.run(UPDATE channels SET quantity = ? WHERE username = ?, [qty, target]);
    bot.sendMessage(msg.chat.id, 🔢 Quantity updated: **${target}** ➡️ **${qty}**.);
});

bot.onText(/\/getqty\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const target = extractUsername(match[1]);
    const row = await db.get(SELECT * FROM channels WHERE username = ?, [target]);
    if (!row) return bot.sendMessage(msg.chat.id, ❌ Target setup nahi mila.);
    bot.sendMessage(msg.chat.id, 📢 Target: ${row.username}\n📊 Mode: ${row.status}\n🔢 Qty: ${row.quantity}\n📦 Panel: ${row.panel_name}\n⚙️ Service: ${row.service_number});
});

bot.onText(/\/startqty\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const target = extractUsername(match[1]);
    await db.run(UPDATE channels SET status = 'ON' WHERE username = ?, [target]);
    bot.sendMessage(msg.chat.id, 🟢 Automation active for **${target}**.);
});

bot.onText(/\/stopqty\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const target = extractUsername(match[1]);
    await db.run(UPDATE channels SET status = 'OFF' WHERE username = ?, [target]);
    bot.sendMessage(msg.chat.id, 🔴 Automation stopped for **${target}**.);
});

bot.onText(/\/channels/, async (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const rows = await db.all(SELECT * FROM channels);
    if (rows.length === 0) return bot.sendMessage(msg.chat.id, "📁 Database khali hai.");
    let out = 📋 **ALL TARGETS**\n\n;
    rows.forEach(r => { out += ${r.status === 'ON' ? '🟢' : '🔴'} **${r.username}** | Qty: ${r.quantity} | Panel: ${r.panel_name} [ID: ${r.service_number}]\n; });
    bot.sendMessage(msg.chat.id, out, { parse_mode: 'Markdown' });
});

// ==========================================
// 📊 REPORTS ENGINE (DYNAMIC PARSING)
// ==========================================

async function runReportEngine(chatId, type, rawInput = null) {
    let interval = "";
    if (type === 'day') interval = "date(timestamp) = date('now', 'localtime')";
    else if (type === '24') interval = "timestamp >= datetime('now', '-24 hours', 'localtime')";
    else if (type === '72') interval = "timestamp >= datetime('now', '-72 hours', 'localtime')";
    else if (type === 'week') interval = "timestamp >= datetime('now', '-7 days', 'localtime')";
    else if (type === 'month') interval = "timestamp >= datetime('now', '-30 days', 'localtime')";

    let query = SELECT COUNT(*) as total_orders, SUM(quantity) as total_qty FROM logs WHERE ${interval};
    let breakdown = SELECT channel, SUM(quantity) as qty, COUNT(*) as cnt FROM logs WHERE ${interval};
    let params = [];

    if (rawInput) {
        const target = extractUsername(rawInput);
        query +=  AND lower(channel) = ?;
        breakdown +=  AND lower(channel) = ?;
        params.push(target.toLowerCase());
    }
    
    breakdown +=  GROUP BY channel;

    const stats = await db.get(query, params);
    const details = await db.all(breakdown, params);

    let txt = 📊 **REPORT (${type.toUpperCase()})**\n\n📈 Total Orders: ${stats.total_orders || 0}\n🔢 Total Qty: ${stats.total_qty || 0}\n\n;
    if(details.length > 0) {
        details.forEach(d => { txt += 🔹 ${d.channel} ➡️ Orders: ${d.cnt} | Qty: ${d.qty}\n; });
    } else { txt += ⚠️ Koyi logs nahi mile.; }

    bot.sendMessage(chatId, txt, { parse_mode: 'Markdown' });
}

bot.onText(/\/(reportday|report24|report72|reportweek|reportmonth)(?:\s+(.+))?/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    await runReportEngine(msg.chat.id, match[1], match[2]);
});

// ==========================================
// 💳 WIZARDS (PANEL & SERVICES)
// ==========================================

bot.onText(/\/NEWPANEL/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    userStates[msg.from.id] = { step: 'P_NAME' };
    bot.sendMessage(msg.chat.id, "📦 Naye Panel ka Name likhein:");
});

bot.onText(/\/Allpanellist/, async (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const rows = await db.all("SELECT name, url FROM panels");
    let out = "💳 PANELS\n\n";
    rows.forEach(r => { out += 📦 **${r.name}** - ${r.url}\n; });
    bot.sendMessage(msg.chat.id, rows.length ? out : "📁 Khali hai.");
});

bot.onText(/\/Removepanel/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    userStates[msg.from.id] = { step: 'P_RM' };
    bot.sendMessage(msg.chat.id, "🗑️ Hatane wale panel ka Name likhein:");
});

bot.onText(/\/CHANNELSERVICE/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    userStates[msg.from.id] = { step: 'S_CH' };
    bot.sendMessage(msg.chat.id, "⚙️ Target ka Username ya Link bhejiye:");
});

bot.onText(/\/allservicelist/, async (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const rows = await db.all(SELECT DISTINCT service_number, panel_name FROM channels WHERE service_number IS NOT NULL);
    let out = "🚀 SERVICES\n\n";
    rows.forEach(r => { out += 🔹 ID: \${r.service_number}\ ➡️ Panel: **${r.panel_name}**\n; });
    bot.sendMessage(msg.chat.id, out, { parse_mode: 'Markdown' });
});

bot.onText(/\/Channelservicelist/, async (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const rows = await db.all(SELECT username, panel_name, service_number FROM channels);
    let out = "⚙️ ROUTING MAP\n\n";
    rows.forEach(r => { out += 📢 **${r.username}** ➡️ ${r.panel_name || 'None'} [${r.service_number || 'None'}]\n; });
    bot.sendMessage(msg.chat.id, out, { parse_mode: 'Markdown' });
});

bot.onText(/\/Serviceremove/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    userStates[msg.from.id] = { step: 'S_RM' };
    bot.sendMessage(msg.chat.id, "🗑️ Service hatane ke liye target ka Username ya Link bhejiye:");
});

// Conversations States Parser
bot.on('message', async (msg) => {
    const userId = msg.from.id;
    const txt = msg.text ? msg.text.trim() : "";
    if (!txt  txt.startsWith('/')  !userStates[userId]) return;

    const st = userStates[userId];
    try {
        if (st.step === 'P_NAME') { st.name = txt.toUpperCase(); st.step = 'P_URL'; return bot.sendMessage(msg.chat.id, "🔗 URL bhejiye:"); }
        if (st.step === 'P_URL') { st.url = txt; st.step = 'P_KEY'; return bot.sendMessage(msg.chat.id, "🔑 API Key bhejiye:"); }
        if (st.step === 'P_KEY') {
            await db.run("INSERT OR REPLACE INTO panels VALUES(?,?,?)", [st.name, st.url, txt]);
            delete userStates[userId];
            return bot.sendMessage(msg.chat.id, "✅ Panel Saved Successfully!");
        }
        if (st.step === 'P_RM') {
            await db.run("DELETE FROM panels WHERE name = ?", [txt.toUpperCase()]);
            delete userStates[userId];
            return bot.sendMessage(msg.chat.id, "🗑️ Panel removed.");
        }
