"use strict";

require("dotenv").config();

const CONFIG = {
    BOT_TOKEN: process.env.BOT_TOKEN || "",

    OWNER_ID: process.env.OWNER_ID || "",

    API_KEY: process.env.API_KEY || ""
};

module.exports = {
    CONFIG
};
