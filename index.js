
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
    bot.sendMessage(msg.chat.id, '👤 Aapki Telegram ID: <code>' + msg.from.id + '</code>', { parse_mode: 'HTML' });
});

// Helper Command: /qtyhelp
bot.onText(/\/qtyhelp/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const helpText = '🛠️ ADMIN COMMANDS CONTROLS\n\n' +
        '🔹 /addchannel [link/username] - New channel add karein\n' +
        '🔹 /removechannel [link/username] - Channel remove karein\n' +
        '🔹 /setqty [link/username] 500 - Fixed quantity set karein\n' +
        '🔹 /getqty [link/username] - Channel status & current qty\n' +
        '🔹 /startqty [link/username] - Channel status ON\n' +
        '🔹 /stopqty [link/username] - Channel status OFF\n' +
        '🔹 /channels - View all configurations\n\n' +
        '📊 REPORTS ENGINE\n' +
        '🔹 /reportday [optional link/username] - Aaj ki report\n' +
        '🔹 /report24 [optional link/username] - Past 24 Hours\n' +
        '🔹 /report72 [optional link/username] - Past 72 Hours\n' +
        '🔹 /reportweek [optional link/username] - Past 7 Days\n' +
        '🔹 /reportmonth [optional link/username] - Past 30 Days\n\n' +
        '💳 PANELS\n' +
        '🔹 /NEWPANEL | /Allpanellist | /Removepanel\n\n' +
        '⚙️ SERVICES MAP\n' +
        '🔹 /CHANNELSERVICE | /allservicelist | /Channelservicelist | /Serviceremove';
    bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
});

// ==========================================
// 🛠️ CHANNEL CONFIG MANAGEMENT COMMANDS
// ==========================================

bot.onText(/\/addchannel\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const target = extractUsername(match[1]);
    try {
        await db.run('INSERT INTO channels (username) VALUES (?)', [target]);
        bot.sendMessage(msg.chat.id, '✅ Target *' + target + '* successfully add ho gaya! Default config apply kar di gayi hai.', { parse_mode: 'Markdown' });
    } catch (e) {
        bot.sendMessage(msg.chat.id, '⚠️ Target list mein pehle se ho sakta hai.');
    }
});

bot.onText(/\/removechannel\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const target = extractUsername(match[1]);
    await db.run('DELETE FROM channels WHERE username = ?', [target]);
    bot.sendMessage(msg.chat.id, '🗑️ Target *' + target + '* database se permanently hataya gaya.', { parse_mode: 'Markdown' });
});

bot.onText(/\/setqty\s+(\S+)\s+(\d+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const target = extractUsername(match[1]);
    const qty = parseInt(match[2]);
    await db.run('UPDATE channels SET quantity = ? WHERE username = ?', [qty, target]);
    bot.sendMessage(msg.chat.id, '🔢 Fixed Quantity updated: *' + target + '* ➡️ *' + qty + '* orders.', { parse_mode: 'Markdown' });
});

bot.onText(/\/getqty\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const target = extractUsername(match[1]);
    const row = await db.get('SELECT * FROM channels WHERE username = ?', [target]);
    if (!row) return bot.sendMessage(msg.chat.id, '❌ Target setup nahi mila.');
    
    const modeStatus = row.status === 'ON' ? '🟢 ON' : '🔴 OFF';
    const resText = '📢 Target: ' + row.username + '\n' +
                    '📊 Automation Mode: ' + modeStatus + '\n' +
                    '🔢 Quantity: ' + row.quantity + '\n' +
                    '📦 Panel: ' + row.panel_name + '\n' +
                    '⚙️ Service ID: ' + row.service_number + '';
                    
    bot.sendMessage(msg.chat.id, resText, { parse_mode: 'Markdown' });
});

bot.onText(/\/startqty\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const target = extractUsername(match[1]);
    await db.run("UPDATE channels SET status = 'ON' WHERE username = ?", [target]);
    bot.sendMessage(msg.chat.id, '🟢 Automation active for *' + target + '*.', { parse_mode: 'Markdown' });
});

bot.onText(/\/stopqty\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const target = extractUsername(match[1]);
    await db.run("UPDATE channels SET status = 'OFF' WHERE username = ?", [target]);
    bot.sendMessage(msg.chat.id, '🔴 Automation stopped for *' + target + '*.', { parse_mode: 'Markdown' });
});

bot.onText(/\/channels/, async (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const rows = await db.all('SELECT * FROM channels');
    if (rows.length === 0) return bot.sendMessage(msg.chat.id, "📁 Database khali hai.");
    let out = '📋 ALL REGISTERED TARGETS\n\n';
    rows.forEach(r => { 
        const ind = r.status === 'ON' ? '🟢' : '🔴';
        out += ind + ' *' + r.username + '* | Qty: ' + r.quantity + ' | Panel: ' + r.panel_name + ' [ID: ' + r.service_number + ']\n'; 
    });
    bot.sendMessage(msg.chat.id, out, { parse_mode: 'Markdown' });
});

// ==========================================
// 📊 REPORTS ENGINE (DYNAMIC FILTERS)
// ==========================================

async function runReportEngine(chatId, type, rawInput = null) {
    let interval = "";
    if (type === 'day') interval = "date(timestamp) = date('now', 'localtime')";
    else if (type === '24') interval = "timestamp >= datetime('now', '-24 hours', 'localtime')";
    else if (type === '72') interval = "timestamp >= datetime('now', '-72 hours', 'localtime')";
    else if (type === 'week') interval = "timestamp >= datetime('now', '-7 days', 'localtime')";
    else if (type === 'month') interval = "timestamp >= datetime('now', '-30 days', 'localtime')";

    let query = 'SELECT COUNT(*) as total_orders, SUM(quantity) as total_qty FROM logs WHERE ' + interval;
    let breakdown = 'SELECT channel, SUM(quantity) as qty, COUNT(*) as cnt FROM logs WHERE ' + interval;
    let params = [];

    if (rawInput) {
        const target = extractUsername(rawInput);
        query += ' AND lower(channel) = ?';
        breakdown += ' AND lower(channel) = ?';
        params.push(target.toLowerCase());
    }
    
    breakdown += ' GROUP BY channel';

    try {
        const stats = await db.get(query, params);
        const details = await db.all(breakdown, params);

        let txt = '📊 REPORT (' + type.toUpperCase() + ')\n\n📈 Total Orders: *' + (stats.total_orders  0) + '*\n🔢 Total Qty: *' + (stats.total_qty  0) + '*\n\n';
        if(details.length > 0) {
            txt += '📌 Breakdown Details:\n';
            details.forEach(d => { txt += '🔹 ' + d.channel + ' ➡️ Orders: ' + d.cnt + ' | Qty: ' + d.qty + '\n'; });
        } else { 
            txt += '⚠️ Diye gaye timeframe mein koyi orders track nahi hue.'; 
        }
        bot.sendMessage(chatId, txt, { parse_mode: 'Markdown' });
    } catch(e) {
        bot.sendMessage(chatId, "❌ Report parse karne mein error aayi.");
    }
}

bot.onText(/\/(reportday|report24|report72|reportweek|reportmonth)(?:\s+(.+))?/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    await runReportEngine(msg.chat.id, match[1], match[2]);
});

// ==========================================
// 💳 DIALOG WIZARDS (PANELS & SERVICES)
// ==========================================

bot.onText(/\/NEWPANEL/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    userStates[msg.from.id] = { step: 'P_NAME' };
    bot.sendMessage(msg.chat.id, "💳 [NEW PANEL WIZARD]\n\nNaye SMM Panel ka ek unique Name likhein (e.g. SMMILITE):");
});

bot.onText(/\/Allpanellist/, async (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const rows = await db.all("SELECT name, url FROM panels");
    let out = "💳 ACTIVE SYSTEM PANELS\n\n";
    rows.forEach(r => { out += 📦 **${r.name}** ➡️ URL: ${r.url}\n; });
    bot.sendMessage(msg.chat.id, rows.length ? out : "📁 Koyi panel added nahi hai.", { parse_mode: 'Markdown' });
});

bot.onText(/\/Removepanel/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    userStates[msg.from.id] = { step: 'P_RM' };
    bot.sendMessage(msg.chat.id, "🗑️ Hatane wale panel ka exact Name likhein:");
});

bot.onText(/\/CHANNELSERVICE/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    userStates[msg.from.id] = { step: 'S_CH' };
    bot.sendMessage(msg.chat.id, "⚙️ [SERVICE MAPPING WIZARD]\n\nTarget Channel ka Link ya Username bhejiye:");
});

bot.onText(/\/allservicelist/, async (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const rows = await db.all('SELECT DISTINCT service_number, panel_name FROM channels WHERE service_number IS NOT NULL');
    let out = "🚀 ACTIVE SERVICE IDs\n\n";
    rows.forEach(r => { out += '🔹 Service ID: ' + r.service_number + ' ➡️ Mapped via: ' + r.panel_name + '\n'; });
    bot.sendMessage(msg.chat.id, out, { parse_mode: 'Markdown' });
});

bot.onText(/\/Channelservicelist/, async (msg) => {
