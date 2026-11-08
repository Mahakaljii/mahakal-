const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const db = require('./db');
const { initAdminCommands } = require('./admin');

console.log('Bot Initialization Started...');
const token = process.env.BOT_TOKEN;

if (!token) {
    console.error('CRITICAL: BOT_TOKEN is missing in environment variables');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Admin commands aur text wizards module ko inject karein
initAdminCommands(bot);

console.log('Bot Engine Connected and Isolated Channels Reader Active...');

let processedLogs = [];

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

        const uniqKey = username.toLowerCase() + '_' + msgId;
        if (processedLogs.includes(uniqKey)) return;
        processedLogs.push(uniqKey);
        if (processedLogs.length > 100) processedLogs.shift();

        const currentChannel = "@" + username.toLowerCase();
        const targetLink = 'https://t.me' + username + '/' + msgId;

        // Whitelisting aur dynamic config filter verification
        const chConfig = await db.get('SELECT * FROM channels WHERE lower(username) = ?', [currentChannel]);
        if (!chConfig  chConfig.status !== 'ON'  !chConfig.panel_name || !chConfig.service_number) return;

        const panelConfig = await db.get('SELECT * FROM panels WHERE name = ?', [chConfig.panel_name]);
        if (!panelConfig || !panelConfig.api_key) return;

        const baseQty = chConfig.quantity;
        const burstSplits = [
            Math.round(baseQty * 0.1) || 10,
            Math.round(baseQty * 0.3) || 30,
            Math.round(baseQty * 0.6) || 50
        ];

        console.log('[ENGINE] New Post Whitelisted: ' + targetLink + ' | Starting splits order delivery...');

        for (let burstQty of burstSplits) {
            const res = await fireOrder(chConfig.panel_name, panelConfig, chConfig.service_number, targetLink, burstQty);
            const statusStr = res.success ? 'SUCCESS' : 'FAILED: ' + res.err;
            
            // Dynamic logs insertion
            await db.run('INSERT INTO logs (channel, link, quantity, status) VALUES (?, ?, ?, ?)', [chConfig.username, targetLink, burstQty, statusStr]);
            
            if (!res.success) {
                console.log('[PANEL ERROR] Order halted: ' + res.err);
                break;
            }
            
            console.log('Split item ' + burstQty + ' successfully passed. Waiting 30s...');
            await new Promise(r => setTimeout(r, 30000));
        }
    } catch (err) { console.error("Engine Automation Error: " + err.message); }
});

bot.on('polling_error', (error) => console.log('[POLLING ERROR]: ' + error.message));
bot.on('error', (error) => console.log('[GLOBAL ERROR]: ' + error.message));
