
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('Bot Initialization Started...');
const token = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID;

if (!token) {
    console.error('CRITICAL: BOT_TOKEN is missing in environment variables');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// ==========================================
// 🗄️ DATABASE CONNECTION & INITIALIZATION
// ==========================================
const dbPath = path.resolve(__dirname, 'bot_database.sqlite');
const dbConn = new sqlite3.Database(dbPath);

dbConn.serialize(() => {
    dbConn.run('CREATE TABLE IF NOT EXISTS panels (name TEXT PRIMARY KEY, url TEXT, api_key TEXT)');
    dbConn.run('INSERT OR IGNORE INTO panels (name, url, api_key) VALUES (?, ?, ?)', 
        ["SMMILITE", "https://smmlite.com", process.env.API_KEY || ""]);

    dbConn.run('CREATE TABLE IF NOT EXISTS channels (username TEXT PRIMARY KEY, quantity INTEGER DEFAULT 10, status TEXT DEFAULT "ON", service_number TEXT DEFAULT "5160", panel_name TEXT DEFAULT "SMMILITE")');

    dbConn.run('CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, channel TEXT, link TEXT, quantity INTEGER, status TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)');
});

const db = {
    run: (sql, params = []) => new Promise((res, rej) => {
        dbConn.run(sql, params, function(err) {
            if (err) rej(err); else res(this);
        });
    }),
    all: (sql, params = []) => new Promise((res, rej) => {
        dbConn.all(sql, params, (err, rows) => {
            if (err) rej(err); else res(rows);
        });
    }),
    get: (sql, params = []) => new Promise((res, rej) => {
        dbConn.get(sql, params, (err, row) => {
            if (err) rej(err); else res(row);
        });
    })
};

// ==========================================
// 🛠️ HELPER FUNCTIONS
// ==========================================
function isOwner(msg) {
    if (!OWNER_ID) return false;
    return msg.from.id.toString() === OWNER_ID.toString();
}

function extractUsername(input) {
    if (!input) return null;
    let clean = input.trim().toLowerCase();
    
    if (clean.includes('t.me/')) {
        let parts = clean.split('t.me/');
        if (parts && parts[1]) {
            let subParts = parts[1].split('/');
            clean = subParts[0];
        }
    }
    
    clean = clean.replace('https://', '').replace('http://', '').replace('@', '');
    return '@' + clean;
}

let userStates = {};
let processedLogs = [];

console.log('Bot Engine Connected and Isolated Channels Reader Active...');

// ==========================================
// 🛠️ CHANNEL CONFIG MANAGEMENT COMMANDS
// ==========================================

bot.onText(/\/myid/, (msg) => {
    bot.sendMessage(msg.chat.id, '👤 Aapki Telegram ID: <code>' + msg.from.id + '</code>', { parse_mode: 'HTML' });
});

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

bot.onText(/\/addchannel\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const target = extractUsername(match[1]);
    try {
        await db.run('INSERT INTO channels (username) VALUES (?)', [target]);
        bot.sendMessage(msg.chat.id, '✅ Target *' + target + '* successfully add ho gaya!', { parse_mode: 'Markdown' });
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
// 📊 REPORTS ENGINE (FIXED STABLE STRINGS)
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

        const totalOrders = stats && stats.total_orders ? stats.total_orders : 0;
        const totalQty = stats && stats.total_qty ? stats.total_qty : 0;

        let txt = '📊 REPORT (' + type.toUpperCase() + ')\n\n📈 Total Orders: *' + totalOrders + '*\n🔢 Total Qty: *' + totalQty + '*\n\n';
        if(details.length > 0) {
            txt += '📌 Breakdown Details:\n';
            details.forEach(d => { txt += '🔹 ' + d.channel + ' ➡️ Orders: ' + d.cnt + ' | Qty: ' + d.qty + '\n'; });
        } else { 
            txt += '⚠️ Diye gaye timeframe mein koyi orders track nahi hue.'; 
        }
        bot.sendMessage(chatId, txt, { parse_mode: 'Markdown' });
    } catch(e) {
