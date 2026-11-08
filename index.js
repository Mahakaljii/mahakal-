"use strict";

const TelegramBot = require("node-telegram-bot-api");

const { CONFIG } = require("./config");

const {
    initializeStorage
} = require("./storage");

const {
    registerPanelCommands
} = require("./panels");

const {
    registerChannelCommands
} = require("./channels");

const {
    registerServiceCommands
} = require("./services");

const {
    registerReportCommands
} = require("./reports");

const {
    registerAdminCommands
} = require("./admin");

let bot = null;
let isShuttingDown = false;

/**
 * Validate application configuration
 */
function validateConfig() {
    if (!CONFIG.BOT_TOKEN) {
        throw new Error("BOT_TOKEN is missing.");
    }

    if (!CONFIG.OWNER_ID || !Number.isSafeInteger(Number(CONFIG.OWNER_ID))) {
        throw new Error("Valid OWNER_ID is required.");
    }
}

/**
 * Register all bot modules
 */
function registerModules(botInstance) {
    console.log("Registering bot modules...");

    registerPanelCommands(botInstance);
    console.log("Panels module loaded.");

    registerChannelCommands(botInstance);
    console.log("Channels module loaded.");

    registerServiceCommands(botInstance);
    console.log("Services module loaded.");

    registerReportCommands(botInstance);
    console.log("Reports module loaded.");

    registerAdminCommands(botInstance);
    console.log("Admin module loaded.");

    console.log("All modules registered successfully.");
}

/**
 * Global Telegram bot error handlers
 */
function registerErrorHandlers(botInstance) {
    botInstance.on("polling_error", (error) => {
        console.error("Telegram polling error:", error.message);
    });

    botInstance.on("webhook_error", (error) => {
        console.error("Telegram webhook error:", error.message);
    });

    botInstance.on("error", (error) => {
        console.error("Telegram bot error:", error.message);
    });
}

/**
 * Start application
 */
async function startBot() {
    try {
        console.log("--------------------------------");
        console.log("Telegram SMM Bot Starting...");
        console.log("--------------------------------");

        // Step 1: Validate configuration
        validateConfig();

        console.log("Configuration validated.");

        // Step 2: Initialize JSON storage
        await initializeStorage();

        console.log("Storage initialized.");

        // Step 3: Create Telegram bot without starting polling
        bot = new TelegramBot(CONFIG.BOT_TOKEN, {
            polling: false
        });

        // Step 4: Register error handlers
        registerErrorHandlers(bot);

        // Step 5: Register all modules
        registerModules(bot);

        // Step 6: Start Telegram polling
        await bot.startPolling();

        console.log("--------------------------------");
        console.log("BOT STARTED SUCCESSFULLY");
        console.log("Owner ID:", CONFIG.OWNER_ID);
        console.log("Polling: Active");
        console.log("--------------------------------");

    } catch (error) {
        console.error("BOT STARTUP FAILED:", error);

        if (bot) {
            try {
                await bot.stopPolling();
            } catch (stopError) {
                console.error("Polling stop error:", stopError.message);
            }
        }

        process.exitCode = 1;
    }
}

/**
 * Graceful shutdown
 */
async function shutdown(signal) {
    if (isShuttingDown) return;

    isShuttingDown = true;

    console.log(\n${signal} received. Shutting down bot...);

    try {
        if (bot) {
            await bot.stopPolling();
        }

        console.log("Bot stopped successfully.");

        process.exit(0);

    } catch (error) {
        console.error("Shutdown error:", error.message);
        process.exit(1);
    }
}

// Handle shutdown signals
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Handle unexpected errors
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);

    shutdown("UNCAUGHT_EXCEPTION");
});

// Start application
startBot();
