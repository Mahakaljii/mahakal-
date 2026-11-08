
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

// ==========================================
// 📊 REPORTS ENGINE (TIME-BASED ANALYTICS)
// ==========================================

// Helper function: SQL Query Filter ke liye timestamps aur intervals check karne ko
async function generateReport(chatId, commandType, targetChannel = null) {
    let timeInterval = '';
    let headline = '';

    switch (commandType) {
        case 'day':
            timeInterval = "date(timestamp) = date('now', 'localtime')";
            headline = "Today's Live Report";
            break;
        case '24':
            timeInterval = "timestamp >= datetime('now', '-24 hours', 'localtime')";
            headline = "Last 24 Hours Report";
            break;
        case '72':
            timeInterval = "timestamp >= datetime('now', '-72 hours', 'localtime')";
            headline = "Last 72 Hours Report";
            break;
        case 'week':
            timeInterval = "timestamp >= datetime('now', '-7 days', 'localtime')";
            headline = "Last 7 Days Report";
            break;
        case 'month':
            timeInterval = "timestamp >= datetime('now', '-30 days', 'localtime')";
            headline = "Last 30 Days Report";
            break;
        default:
            timeInterval = "date(timestamp) = date('now', 'localtime')";
            headline = "Report";
    }

    let query = SELECT COUNT(*) as total_orders, SUM(quantity) as total_qty FROM logs WHERE ${timeInterval};
    let params = [];

    if (targetChannel) {
        query +=  AND lower(channel) = ?;
        params.push(targetChannel.toLowerCase());
        headline +=  for ${targetChannel};
    }

    try {
        const stats = await db.get(query, params);
        let detailQuery = SELECT channel, SUM(quantity) as qty, COUNT(*) as cnt FROM logs WHERE ${timeInterval};
        if (targetChannel) detailQuery +=  AND lower(channel) = ?;
        detailQuery +=  GROUP BY channel;

        const details = await db.all(detailQuery, params);

        let reportText = 📊 **${headline.toUpperCase()}**\n\n;
        reportText += 📈 **Total Successful Orders:** ${stats.total_orders || 0}\n;
        reportText += 🔢 **Total Accumulated Quantity:** ${stats.total_qty || 0}\n\n;

        if (details.length > 0) {
            reportText += 📌 **Channel Wise Breakdowns:**\n;
            details.forEach(d => {
                reportText += 🔹 ${d.channel} ➡️ Orders: ${d.cnt} | Qty: ${d.qty}\n;
            });
        } else {
            reportText += ⚠️ Diye gaye time frame mein koyi orders track nahi hue.;
        }

        bot.sendMessage(chatId, reportText, { parse_mode: 'Markdown' });
    } catch (err) {
        console.error("Report Generation Error: ", err.message);
        bot.sendMessage(chatId, "❌ Report generate karne mein koyi internal database issue aaya.");
    }
}

// Global Regex Handler for Reports commands (supports optionals [@channel])
bot.onText(/\/(reportday|report24|report72|reportweek|reportmonth)(?:\s+(.+))?/, async (msg, match) => {
    if (!isOwner(msg)) return bot.sendMessage(msg.chat.id, "❌ Access Denied!");
    
    const cmdType = match[1].replace('report', ''); // Extract day, 24, 72, week, month
    let targetChannel = match[2] ? match[2].trim() : null;

    if (targetChannel && !targetChannel.startsWith('@')) {
        targetChannel = '@' + targetChannel;
    }

    await generateReport(msg.chat.id, cmdType, targetChannel);
});


// ==========================================
// 🚀 BACKEND ORDER TRANSACTION TRIGGER (AXIOS)
// ==========================================

async function sendOrderDynamic(panelName, apiConfig, serviceId, link, quantity) {
    try {
        console.log([ROUTE ENGINE] Sending via ${panelName} | Link: ${link} | Qty: ${quantity} | Service: ${serviceId});
        
        const params = new URLSearchParams();
        params.append("key", apiConfig.api_key || "");
        params.append("action", "add");
        params.append("service", serviceId.toString());
        params.append("link", link);
        params.append("quantity", quantity.toString());
        
        const response = await axios.post(apiConfig.url, params.toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 10000 // 10 seconds timeout protection
        });

        const data = response.data;
        console.log([API RESPONSE] ${panelName}:, JSON.stringify(data));
        
        if (data && data.order) {
            console.log(Order Placed Success ID: ${data.order});
            return { success: true, orderId: data.order };
        } else if (data && data.error) {
            console.log(Panel API returned Error: ${data.error});
            return { success: false, error: data.error };
        } else {
            return { success: false, error: "Structure format unknown" };
        }
    } catch (err) {
        console.log(Connection Failure on ${panelName}:  + err.message);
        return { success: false, error: err.message };
    }
}


// ==========================================
// 📢 AUTOMATED BOT CHANNEL POST HANDLER
// ==========================================

bot.on('channel_post', async (msg) => {
    try {
        const username = msg.sender_chat?.username || msg.chat?.username;
        const measure_id = msg.message_id;
        
        if (!username || !measure_id) return;

        // Unique Key Protection (Duplicate posts filter)
        const uniqKey = username.toLowerCase() + "_" + measure_id;
        if (processedLogs.includes(uniqKey)) {
            console.log("Duplicate Post Detected and Skipped: " + uniqKey);
            return;
        }
        processedLogs.push(uniqKey);
        if (processedLogs.length > 100) processedLogs.shift();

        const cleanUsername = username.replace("@", "");
        const currentChannelName = "@" + cleanUsername.toLowerCase();
        
        // Dynamic link generation for panel orders
        const targetLink = "https://t.me" + cleanUsername + "/" + measure_id;
        console.log("New Post Trigger Captured:", targetLink);

        // Database Configuration Lookup for this channel
        const chConfig = await db.get(SELECT * FROM channels WHERE lower(username) = ?, [currentChannelName]);

        // Authorization Check
        if (!chConfig) {
            console.log(Channel ${currentChannelName} system database mein whitelist nahi hai.);
            return;
        }

        // Status Verification Check
        if (chConfig.status !== 'ON') {
            console.log(Automation OFF status mode for ${currentChannelName}. Skipping.);
            return;
        }

        // Service Mapping Check
        if (!chConfig.panel_name || !chConfig.service_number) {
            console.log(Configuration incomplete (Panel or Service missing) for ${currentChannelName}.);
            return;
        }

        // Fetch target routing panel configurations
        const panelConfig = await db.get(SELECT * FROM panels WHERE name = ?, [chConfig.panel_name]);
        if (!panelConfig) {
            console.log(Mapped Panel '${chConfig.panel_name}' system panels list mein nahi mila.);
            return;
        }

        // Set Quantity dynamically from Admin inputs (burst distribution logic)
        const baseQty = chConfig.quantity;
        
        // Aapki standard burst delivery split scheme (10, 30, 50 ke sequential chunks)
        // Yahan hum base config ke ratios mein delay bursts chalayenge.
        const burstSplits = [
            Math.round(baseQty * 0.1) || 10,
            Math.round(baseQty * 0.3) || 30,
            Math.round(baseQty * 0.6) || 50
        ];
        
        let trackSuccessCount = 0;

        for (let burstQty of burstSplits) {
            const result = await sendOrderDynamic(
                chConfig.panel_name, 
                panelConfig, 
                chConfig.service_number, 
                targetLink, 
                burstQty
            );

if (result.success) {
                trackSuccessCount += burstQty;
                // Logs database mein data dynamically register karein real-time stats ke liye
                await db.run(INSERT INTO logs (channel, link, quantity, status) VALUES (?, ?, ?, ?),
                    [chConfig.username, targetLink, burstQty, 'SUCCESS']);
            } else {
                await db.run(INSERT INTO logs (channel, link, quantity, status) VALUES (?, ?, ?, ?),
                    [chConfig.username, targetLink, burstQty, FAILED: ${result.error}]);
                console.log(Burst process execution halted due to response failure.);
                break;
            }

            console.log(Burst item (${burstQty}) processed. Waiting 30 seconds interval cooldown...);
            await new Promise(r => setTimeout(r, 30000));
        }

        console.log([PROCESS FINISHED] Processed total ${trackSuccessCount} orders dynamically for ${currentChannelName});

    } catch (err) {
        console.error("System Core Handler Error: " + err.message);
    }
});

// Anti-crash standard error handlers
bot.on('polling_error', (error) => console.log('[POLLING ERROR]: ' + error.message));
bot.on('error', (error) => console.log('[GLOBAL ERROR]: ' + error.message));
