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
    bot.sendMessage(msg.chat.id, `👤 Aapki Telegram ID: <code>\${msg.from.id}</code>`, { parse_mode: 'HTML' });
});

// Helper Command: /qtyhelp
bot.onText(/\/qtyhelp/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const helpText = `🛠️ **ADMIN COMMANDS CONTROLS**\n\n` +
        `🔹 **/addchannel [link/username]** - New channel add karein\n` +
        `🔹 **/removechannel [link/username]** - Channel remove karein\n` +
        `🔹 **/setqty [link/username] 500** - Fixed quantity set karein\n` +
        `🔹 **/getqty [link/username]** - Channel status & current qty\n` +
        `🔹 **/startqty [link/username]** - Channel status ON\n` +
        `🔹 **/stopqty [link/username]** - Channel status OFF\n` +
        `🔹 **/channels** - View all configurations\n\n` +
        `📊 **REPORTS ENGINE**\n` +
        `🔹 /reportday [optional link/username] - Aaj ki report\n` +
        `🔹 /report24 [optional link/username] - Past 24 Hours\n` +
        `🔹 /report72 [optional link/username] - Past 72 Hours\n` +
        `🔹 /reportweek [optional link/username] - Past 7 Days\n` +
        `🔹 /reportmonth [optional link/username] - Past 30 Days\n\n` +
        `💳 **PANELS**\n` +
        `🔹 /NEWPANEL | /Allpanellist | /Removepanel\n\n` +
        `⚙️ **SERVICES MAP**\n` +
        `🔹 /CHANNELSERVICE | /allservicelist | /Channelservicelist | /Serviceremove`;
    bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
});

// ==========================================
// 🛠️ CHANNEL CONFIG MANAGEMENT COMMANDS
// ==========================================

bot.onText(/\/addchannel\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const target = extractUsername(match[1]);
    try {
        await db.run(`INSERT INTO channels (username) VALUES (?)`, [target]);
        bot.sendMessage(msg.chat.id, `✅ Target **\${target}** successfully add ho gaya! Default config apply kar di gayi hai.`, { parse_mode: 'Markdown' });
    } catch (e) {
        bot.sendMessage(msg.chat.id, `⚠️ Target list mein pehle se ho sakta hai.`);
    }
});

bot.onText(/\/removechannel\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const target = extractUsername(match[1]);
    await db.run(`DELETE FROM channels WHERE username = ?`, [target]);
    bot.sendMessage(msg.chat.id, `🗑️ Target **\${target}** database se permanently hataya gaya.`, { parse_mode: 'Markdown' });
});

bot.onText(/\/setqty\s+(\S+)\s+(\d+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const target = extractUsername(match[1]);
    const qty = parseInt(match[2]);
    await db.run(`UPDATE channels SET quantity = ? WHERE username = ?`, [qty, target]);
    bot.sendMessage(msg.chat.id, `🔢 Fixed Quantity updated: **\${target}** ➡️ **\${qty}** orders.`, { parse_mode: 'Markdown' });
});

bot.onText(/\/getqty\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const target = extractUsername(match[1]);
    const row = await db.get(`SELECT * FROM channels WHERE username = ?`, [target]);
    if (!row) return bot.sendMessage(msg.chat.id, `❌ Target setup nahi mila.`);
    bot.sendMessage(msg.chat.id, `📢 **Target:** \${row.username}\n📊 **Automation Mode:** \${row.status === 'ON' ? '🟢 ON' : '🔴 OFF'}\n🔢 **Quantity:** \${row.quantity}\n📦 **Panel:** \${row.panel_name}\n⚙️ **Service ID:** \\`\${row.service_number}\\``, { parse_mode: 'Markdown' });
});

bot.onText(/\/startqty\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const target = extractUsername(match[1]);
    await db.run(`UPDATE channels SET status = 'ON' WHERE username = ?`, [target]);
    bot.sendMessage(msg.chat.id, `🟢 Automation active for **\${target}**.`);
});

bot.onText(/\/stopqty\s+(.+)/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const target = extractUsername(match[1]);
    await db.run(`UPDATE channels SET status = 'OFF' WHERE username = ?`, [target]);
    bot.sendMessage(msg.chat.id, `🔴 Automation stopped for **\${target}**.`);
});

bot.onText(/\/channels/, async (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const rows = await db.all(`SELECT * FROM channels`);
    if (rows.length === 0) return bot.sendMessage(msg.chat.id, "📁 Database khali hai.");
    let out = `📋 **ALL REGISTERED TARGETS**\n\n`;
    rows.forEach(r => { out += `\${r.status === 'ON' ? '🟢' : '🔴'} **\${r.username}** | Qty: 	ext{\${r.quantity}} | Panel: \${r.panel_name} [ID: \${r.service_number}]\n`; });
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

    let query = `SELECT COUNT(*) as total_orders, SUM(quantity) as total_qty FROM logs WHERE \${interval}`;
    let breakdown = `SELECT channel, SUM(quantity) as qty, COUNT(*) as cnt FROM logs WHERE \${interval}`;
    let params = [];

    if (rawInput) {
        const target = extractUsername(rawInput);
        query += ` AND lower(channel) = ?`;
        breakdown += ` AND lower(channel) = ?`;
        params.push(target.toLowerCase());
    }
    
    breakdown += ` GROUP BY channel`;

    try {
        const stats = await db.get(query, params);
        const details = await db.all(breakdown, params);

        let txt = `📊 **REPORT (\${type.toUpperCase()})**\n\n📈 Total Orders: **\${stats.total_orders || 0}**\n🔢 Total Qty: **\${stats.total_qty || 0}**\n\n`;
        if(details.length > 0) {
            txt += `📌 **Breakdown Details:**\n`;
            details.forEach(d => { txt += `🔹 \${d.channel} ➡️ Orders: \${d.cnt} | Qty: \${d.qty}\n`; });
        } else { 
            txt += `⚠️ Diye gaye timeframe mein koyi orders track nahi hue.`; 
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
    bot.sendMessage(msg.chat.id, "💳 **[NEW PANEL WIZARD]**\n\nNaye SMM Panel ka ek unique **Name** likhein (e.g. SMMILITE):");
});

bot.onText(/\/Allpanellist/, async (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const rows = await db.all("SELECT name, url FROM panels");
    let out = "💳 **ACTIVE SYSTEM PANELS**\n\n";
    rows.forEach(r => { out += `📦 **\${r.name}** ➡️ URL: \${r.url}\n`; });
    bot.sendMessage(msg.chat.id, rows.length ? out : "📁 Koyi panel added nahi hai.", { parse_mode: 'Markdown' });
});

bot.onText(/\/Removepanel/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    userStates[msg.from.id] = { step: 'P_RM' };
    bot.sendMessage(msg.chat.id, "🗑️ Hatane wale panel ka exact **Name** likhein:");
});

bot.onText(/\/CHANNELSERVICE/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    userStates[msg.from.id] = { step: 'S_CH' };
    bot.sendMessage(msg.chat.id, "⚙️ **[SERVICE MAPPING WIZARD]**\n\nTarget Channel ka **Link ya Username** bhejiye:");
});

bot.onText(/\/allservicelist/, async (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const rows = await db.all(`SELECT DISTINCT service_number, panel_name FROM channels WHERE service_number IS NOT NULL`);
    let out = "🚀 **ACTIVE SERVICE IDs**\n\n";
    rows.forEach(r => { out += `🔹 Service ID: \\`\${r.service_number}\\` ➡️ Mapped via: **\${r.panel_name}**\n`; });
    bot.sendMessage(msg.chat.id, out, { parse_mode: 'Markdown' });
});

bot.onText(/\/Channelservicelist/, async (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    const rows = await db.all(`SELECT username, panel_name, service_number FROM channels`);
    let out = "⚙️ **ACTIVE CHANNEL ROUTING MAP**\n\n";
    rows.forEach(r => { out += `📢 **\${r.username}** ➡️ Panel: \${r.panel_name || 'None'} [Service ID: \\`\${r.service_number || 'None'}\\` ]\n`; });
    bot.sendMessage(msg.chat.id, out, { parse_mode: 'Markdown' });
});

bot.onText(/\/Serviceremove/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    userStates[msg.from.id] = { step: 'S_RM' };
    bot.sendMessage(msg.chat.id, "🗑️ Service routing clear karne ke liye channel ka **Username ya Link** bhejiye:");
});

// Interactive state message responses parser
bot.on('message', async (msg) => {
    const userId = msg.from.id;
    const txt = msg.text ? msg.text.trim() : "";
    if (!txt || txt.startsWith('/') || !userStates[userId]) return;

    const st = userStates[userId];
    try {
        if (st.step === 'P_NAME') { st.name = txt.toUpperCase(); st.step = 'P_URL'; return bot.sendMessage(msg.chat.id, "🔗 Us panel ka **API URL** bhejiye:"); }
        if (st.step === 'P_URL') { st.url = txt; st.step = 'P_KEY'; return bot.sendMessage(msg.chat.id, "🔑 Us panel ki **API KEY** bhejiye:"); }
        if (st.step === 'P_KEY') {
            await db.run("INSERT OR REPLACE INTO panels VALUES(?,?,?)", [st.name, st.url, txt]);
            delete userStates[userId];
            return bot.sendMessage(msg.chat.id, "✅ **Naya SMM Panel successfully system mein save ho gaya hai!**");
        }
        if (st.step === 'P_RM') {
            await db.run("DELETE FROM panels WHERE name = ?", [txt.toUpperCase()]);
            delete userStates[userId];
            return bot.sendMessage(msg.chat.id, `🗑️ Panel **\${txt.toUpperCase()}** system se remove kar diya gaya.`);
        }
        if (st.step === 'S_CH') { st.target = extractUsername(txt); st.step = 'S_PAN'; return bot.sendMessage(msg.chat.id, "📦 Us **Panel ka Name** likhein jisse connect karna hai (e.g. SMMILITE):"); }
        if (st.step === 'S_PAN') { st.pan = txt.toUpperCase(); st.step = 'S_NUM'; return bot.sendMessage(msg.chat.id, "⚙️ Us panel ka **Service Number (ID)** bhejiye:"); }
        if (st.step === 'S_NUM') {
            const chCheck = await db.get(`SELECT username FROM channels WHERE username = ?`, [st.target]);
            if (!chCheck) await db.run(`INSERT INTO channels (username) VALUES (?)`, [st.target]);
            await db.run("UPDATE channels SET panel_name = ?, service_number = ? WHERE username = ?", [st.pan, txt, st.target]);
            delete userStates[userId];
            return bot.sendMessage(msg.chat.id, `🚀 **Success!** Routing set ho gayi:\n📢 Channel: **\${st.target}**\n📦 Panel: **\${st.pan}**\n⚙️ Service ID: \\`\${txt}\\``, { parse_mode: 'Markdown' });
        }
        if (st.step === 'S_RM') {
            const target = extractUsername(txt);
            await db.run("UPDATE channels SET service_number = NULL, panel_name = NULL WHERE username = ?", [target]);
            delete userStates[userId];
            return bot.sendMessage(msg.chat.id, `🧹 Channel **\${target}** se service rules complete remove kar diye gaye hain.`);
        }
    } catch(e) { delete userStates[userId]; }
});

// ==========================================
// 📢 AUTOMATED POST HANDLER ENGINE (SMM)
// ==========================================

async function fireOrder(panel, config, service, link, qty) {
    try {
        const params = new URLSearchParams();
        params.append("key", config.api_key);
        params.append("action", "add");
        params.append("service", service);
        params.append("link", link);
        params.append("quantity", qty.toString());

        const res = await axios.post(config.url, params.toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 12000
        });
        return res.data && res.data.order ? { success: true } : { success: false, err: res.data.error || "Unknown response structure" };
    } catch(e) { return { success: false, err: e.message }; }
}

bot.on('channel_post', async (msg) => {
    try {
        const username = msg.sender_chat?.username || msg.chat?.username;
        const msgId = msg.message_id;
        if (!username || !msgId) return;

        const uniqKey = `\${username.toLowerCase()}_\${msgId}`;
        if (processedLogs.includes(uniqKey)) return;
        processedLogs.push(uniqKey);
        if (processedLogs.length > 100) processedLogs.shift();

        const currentChannel = "@" + username.toLowerCase();
        const targetLink = `https://t.me/\${username}/\${msgId}`;

        const chConfig = await db.get(`SELECT * FROM channels WHERE lower(username) = ?`, [currentChannel]);
        if (!chConfig || chConfig.status !== 'ON' || !chConfig.panel_name || !chConfig.service_number) return;

        const panelConfig = await db.get(`SELECT * FROM panels WHERE name = ?`, [chConfig.panel_name]);
        if (!panelConfig || !panelConfig.api_key) return;

        const baseQty = chConfig.quantity;
        const burstSplits = [
            Math.round(baseQty * 0.1) || 10,
            Math.round(baseQty * 0.3) || 30,
            Math.round(baseQty * 0.6) || 50
        ];

        console.log(`[ENGINE] New Post Whitelisted: \${targetLink} | Starting splits order delivery...`);

        for (let burstQty of burstSplits) {
            const res = await fireOrder(chConfig.panel_name, panelConfig, chConfig.service_number, targetLink, burstQty);
            const statusStr = res.success ? 'SUCCESS' : `FAILED: \${res.err}`;
            
            await db.run(`INSERT INTO logs (channel, link, quantity, status) VALUES (?, ?, ?, ?)`, [chConfig.username, targetLink, burstQty, statusStr]);
            
            if (!res.success) {
                console.log(`[PANEL ERROR] Order halted: 	ext{\${res.err}}`);
                break;
            }
            
            console.log(`Split item \${burstQty} successfully passed. Waiting 30s...`);
            await new Promise(r => setTimeout(r, 30000));
        }
    } catch (err) { console.error("Engine Automation Error: " + err.message); }
});

bot.on('polling_error', (error) => console.log('[POLLING ERROR]: ' + error.message));
bot.on('error', (error) => console.log('[GLOBAL ERROR]: ' + error.message));
