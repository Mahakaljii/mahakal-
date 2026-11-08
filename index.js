
// ==========================================
// 💳 SMM PANEL MANAGEMENT (DYNAMIC WIZARD)
// ==========================================

// 📌 /NEWPANEL - Step 1: Start Panel Wizard
bot.onText(/\/NEWPANEL/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    
    userStates[msg.from.id] = { step: 'PANEL_NAME' };
    bot.sendMessage(msg.chat.id, "💳 [NEW PANEL WIZARD]\n\nNaye SMM Panel ka ek unique Name dijiye (e.g., SMMILITE, BULKPANEL):", { parse_mode: 'Markdown' });
});

// 📌 /Allpanellist - Show active integrated panels
bot.onText(/\/Allpanellist/, async (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    
    try {
        const rows = await db.all(SELECT name, url FROM panels);
        if (rows.length === 0) return bot.sendMessage(msg.chat.id, "📁 Koyi bhi panel system mein added nahi hai.");
        
        let out = 💳 **ACTIVE SMM PANELS LIST**\n\n;
        rows.forEach((r, idx) => {
            out += ${idx + 1}. 📦 **${r.name}**\n🔗 URL: ${r.url}\n\n;
        });
        bot.sendMessage(msg.chat.id, out, { parse_mode: 'Markdown' });
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Panels fetch karne mein error aayi.");
    }
});

// 📌 /Removepanel - Start Drop Panel Wizard
bot.onText(/\/Removepanel/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    
    userStates[msg.from.id] = { step: 'PANEL_REMOVE' };
    bot.sendMessage(msg.chat.id, "🗑️ Konsa panel remove karna hai? Panel ka exact Name likh kar bhejiye:");
});

// ==========================================
// ⚙️ SERVICE NUMBER CONTROLS (DYNAMIC WIZARD)
// ==========================================

// 📌 /CHANNELSERVICE - Start Service Route Wizard
bot.onText(/\/CHANNELSERVICE/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    
    userStates[msg.from.id] = { step: 'SERVICE_CHANNEL' };
    bot.sendMessage(msg.chat.id, "⚙️ [CHANNEL SERVICE SETUP]\n\nJis channel ya group par service set karni hai, uska Username (@ target ke sath) ya complete link bhejiye:");
});

// 📌 /allservicelist - List all globally active panel services
bot.onText(/\/allservicelist/, async (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    
    try {
        const rows = await db.all(SELECT DISTINCT service_number, panel_name FROM channels WHERE service_number IS NOT NULL);
        if (rows.length === 0 || (rows.length === 1 && !rows[0].service_number)) {
            return bot.sendMessage(msg.chat.id, "📁 Koyi bhi active service number system mein mapped nahi hai.");
        }
        
        let out = 🚀 **ACTIVE SYSTEM SERVICES**\n\n;
        rows.forEach(r => {
            if(r.service_number) {
                out += 🔹 Service ID: \${r.service_number}\ ➡️ Mapped via Panel: **${r.panel_name}**\n;
            }
        });
        bot.sendMessage(msg.chat.id, out, { parse_mode: 'Markdown' });
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Services fetch karne mein error aayi.");
    }
});

// 📌 /Channelservicelist - List service maps on active channels
bot.onText(/\/Channelservicelist/, async (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    
    try {
        const rows = await db.all(SELECT username, panel_name, service_number FROM channels);
        if (rows.length === 0) return bot.sendMessage(msg.chat.id, "📁 Channels database empty hai.");
        
        let out = ⚙️ **CHANNEL ROUTING MAP LIST**\n\n;
        rows.forEach(r => {
            out += 📢 **${r.username}**\n📦 Panel: ${r.panel_name || 'None'} | ⚙️ Service ID: \${r.service_number || 'Not Set'}\\n------------------------\n;
        });
        bot.sendMessage(msg.chat.id, out, { parse_mode: 'Markdown' });
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Map list load karne mein error aayi.");
    }
});

// 📌 /Serviceremove - Start Service Remove Wizard
bot.onText(/\/Serviceremove/, (msg) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    
    userStates[msg.from.id] = { step: 'SERVICE_REMOVE_CHANNEL' };
    bot.sendMessage(msg.chat.id, "🗑️ Jis channel ya group se service route remove karni hai, uska Username (@ ke sath) bhejiye:");
});

// ==========================================
// 🧠 TEXT MESSAGE HANDLER FOR MULTI-STEP WIZARDS
// ==========================================

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text ? msg.text.trim() : '';

    // Agar message command hai ya phir text missing hai to skip karein
    if (!text  text.startsWith('/')  !userStates[userId]) return;

    const state = userStates[userId];

    try {
        // --- 💳 NEW PANEL WIZARD PROCESS ---
        if (state.step === 'PANEL_NAME') {
            state.panelName = text.toUpperCase();
            state.step = 'PANEL_URL';
            return bot.sendMessage(chatId, ✨ Panel Name: **${state.panelName}**\n\nAb us SMM Panel ka **API URL** bhejiye (e.g., https://smmlite.com):, { parse_mode: 'Markdown' });
        }
        
        if (state.step === 'PANEL_URL') {
            state.panelUrl = text;
            state.step = 'PANEL_KEY';
            return bot.sendMessage(chatId, 🔗 URL Save ho gaya.\n\nAb us panel ki **API KEY** bhejiye:);
        }
        
        if (state.step === 'PANEL_KEY') {
            const apiKey = text;
            await db.run(INSERT OR REPLACE INTO panels (name, url, api_key) VALUES (?, ?, ?), 
                [state.panelName, state.panelUrl, apiKey]);
            
            delete userStates[userId];
            return bot.sendMessage(chatId, 🎉 **Success!** Naya Panel save ho gaya hai:\n\n📦 Name: **${state.panelName}**\n🔗 URL: ${state.panelUrl}, { parse_mode: 'Markdown' });
        }

        // --- 🗑️ REMOVE PANEL PROCESS ---
        if (state.step === 'PANEL_REMOVE') {
            const targetPanel = text.toUpperCase();
            const check = await db.get(SELECT name FROM panels WHERE name = ?, [targetPanel]);
            
            if (!check) {
                delete userStates[userId];
                return bot.sendMessage(chatId, ❌ **${targetPanel}** naam ka koyi panel system mein nahi hai.);
            }

            await db.run(DELETE FROM panels WHERE name = ?, [targetPanel]);
            delete userStates[userId];
            return bot.sendMessage(chatId, 🗑️ Panel **${targetPanel}** ko successfully remove kar diya gaya.);
        }

        // --- ⚙️ CHANNEL SERVICE MAP PROCESS ---
        if (state.step === 'SERVICE_CHANNEL') {
            let channel = text.toLowerCase();
            if (!channel.startsWith('@')) {
                // Agar complete link hai to username extract karein
                if(channel.includes('t.me/')) {
                    channel = '@' + channel.split('t.me/')[1].split('/')[0];
                } else {
                    channel = '@' + channel;
                }
            }
            
            state.targetChannel = channel;
            state.step = 'SERVICE_PANEL_SELECT';
            return bot.sendMessage(chatId, 📢 Target Channel: **${channel}**\n\nAb us **Panel ka Name** likhiye jisse yeh service connect karni hai (e.g., SMMILITE):, { parse_mode: 'Markdown' });
        }

        if (state.step === 'SERVICE_PANEL_SELECT') {
            const selectedPanel = text.toUpperCase();
            const panelCheck = await db.get(SELECT name FROM panels WHERE name = ?, [selectedPanel]);
            
            if (!panelCheck) {
                delete userStates[userId];
                return bot.sendMessage(chatId, ❌ **${selectedPanel}** naam ka panel active nahi hai. Pehle /NEWPANEL se use add karein.);
            }

state.targetPanel = selectedPanel;
            state.step = 'SERVICE_NUMBER_INPUT';
            return bot.sendMessage(chatId, 📦 Selected Panel: **${selectedPanel}**\n\nAb us panel ka **Service Number (ID)** bhejiye jo automation par lagana hai:);
        }

        if (state.step === 'SERVICE_NUMBER_INPUT') {
            const serviceNum = text;
            
            // Check karein channel database mein hai ya nahi, agar nahi to temporary add karein
            const chCheck = await db.get(SELECT username FROM channels WHERE username = ?, [state.targetChannel]);
            if (!chCheck) {
                await db.run(INSERT INTO channels (username, quantity, status) VALUES (?, 10, 'ON'), [state.targetChannel]);
            }

            await db.run(UPDATE channels SET panel_name = ?, service_number = ? WHERE username = ?,
                [state.targetPanel, serviceNum, state.targetChannel]);

            delete userStates[userId];
            return bot.sendMessage(chatId, 🚀 **Routing Successful!**\n\n📢 Channel: **${state.targetChannel}**\n📦 Panel: **${state.targetPanel}**\n⚙️ Service ID: \${serviceNum}\ par dynamically set ho gaya hai!, { parse_mode: 'Markdown' });
        }

        // --- 🗑️ REMOVE SERVICE PROCESS ---
        if (state.step === 'SERVICE_REMOVE_CHANNEL') {
            let channel = text.toLowerCase();
            if (!channel.startsWith('@')) channel = '@' + channel;

            const checkCh = await db.get(SELECT username FROM channels WHERE username = ?, [channel]);
            if (!checkCh) {
                delete userStates[userId];
                return bot.sendMessage(chatId, ❌ Channel **${channel}** config map mein nahi mila., { parse_mode: 'Markdown' });
            }

            await db.run(UPDATE channels SET service_number = NULL, panel_name = NULL WHERE username = ?, [channel]);
            delete userStates[userId];
