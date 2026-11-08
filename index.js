𝙐𝙍𝙑𝙄 𝙂𝘼𝙈𝙀𝙍:
const TelegramBot = require('node-telegram-bot-api');

console.log('Bot Initialization Started...');

// ENV CONFIGURATION
const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('CRITICAL: BOT_TOKEN is missing in environment variables');
    process.exit(1);
}

// SMMULITE PANEL CONFIG
const ACTIVE_PANEL = {
    name: "SMMILITE",
    url: "https://smmlite.com/api/v2", 
    key: process.env.API_KEY,
    service: "5160"
};

if (!ACTIVE_PANEL.key) {
    console.warn('WARNING: API_KEY is missing in environment variables. Orders will fail.');
}

const bot = new TelegramBot(token, { polling: true });
console.log('Bot Started Successfully and Polling...');

// YOUR CHANNELS
const CHANNELS = [
    '@URVIGAMER',
    '@Raja_Game_bunny'
];

// MEMORY-SAFE DUPLICATE PROTECTION
let processedLogs = [];

// SEND ORDER FUNCTION
async function sendOrder(link, quantity) {
    try {
        console.log("Sending | Link: " + link + " | Qty: " + quantity);
        
        const params = new URLSearchParams();
        params.append("key", ACTIVE_PANEL.key || "");
        params.append("action", "add");
        params.append("service", ACTIVE_PANEL.service);
        params.append("link", link);
        params.append("quantity", quantity.toString());
        
        const response = await fetch(ACTIVE_PANEL.url, {
            method: 'POST',
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString()
        });

        const responseText = await response.text();
        console.log("Raw API Response:", responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.log("Panel returned non-JSON text. Link or API Key might be invalid.");
            return false;
        }
        
        if (data && data.order) {
            console.log("Order Success ID: " + data.order);
            return true;
        } else if (data && data.error) {
            console.log("Panel Error: " + data.error);
            return false;
        } else {
            console.log("Order Failed: Unknown response structure");
            return false;
        }
    } catch (err) {
        console.log("Network/Panel Connection Error: " + err.message);
        return false;
    }
}

// BOT CHANNEL POST HANDLER
bot.on('channel_post', async (msg) => {
    try {
        const username = msg.sender_chat?.username || msg.chat?.username;
        const measure_id = msg.message_id;
        
        if (!username || !measure_id) return;

        // Unique Key Protection
        const uniqKey = username.toLowerCase() + "_" + measure_id;
        if (processedLogs.includes(uniqKey)) {
            console.log("Duplicate Post Skipped: " + uniqKey);
            return;
        }
        processedLogs.push(uniqKey);
        if (processedLogs.length > 100) processedLogs.shift();

        const cleanUsername = username.replace("@", "");
        
        // 🔗 [सुपर फिक्स]: बिना बैक-टिक (`) और बिना $ के साधारण जोड़कर असली टेलीग्राम लिंक बनाना
        // इससे पैनल को बिल्कुल सही लिंक जैसे https://t.me/ जाएगा।
        const link = "https://t.me/" + cleanUsername + "/" + measure_id;
        console.log("New Post Detected:", link);

        // Channel Authorization
        const channelUsername = "@" + cleanUsername;
        const isAllowed = CHANNELS.some(ch => ch.toLowerCase() === channelUsername.toLowerCase());

        if (!isAllowed) {
            console.log("Channel " + channelUsername + " not in allowed list");
            return;
        }

        const burst = [100, 230, 250];
        let allSuccessful = true;

        for (let qty of burst) {
            const success = await sendOrder(link, qty);
            if (!success) {
                allSuccessful = false;
                break;
            }
            console.log("Waiting 30 seconds before next burst item (" + qty + ")...");
            await new Promise(r => setTimeout(r, 30000));
        }

if (allSuccessful) {
            console.log("All orders processed successfully for " + link);
        } else {
            console.log("Failed to complete all burst orders for " + link);
        }

    } catch (err) {
        console.log("System Error: " + err.message);
    }
});

// Error handling for bot layers
bot.on('polling_error', (error) => {
    console.log('Polling Error: ' + error.message);
});

bot.on('error', (error) => {
    console.log('Bot Error: ' + error.message);
});
