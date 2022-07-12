"use strict";
exports.__esModule = true;
var discord = require("discord.js");
var discord_js_1 = require("discord.js");
var dotenv = require("dotenv");
dotenv.config();
var PREFIX = '$';
var client = new discord.Client({
    intents: [
        discord_js_1.Intents.FLAGS.GUILDS,
        discord_js_1.Intents.FLAGS.GUILD_MESSAGES,
        discord_js_1.Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        discord_js_1.Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ]
});
client.on('ready', function () {
    console.log("Bot is ready");
});
client.on('messageCreate', function (msg) {
    if (msg.content === "".concat(PREFIX, "ping")) {
        msg.channel.send("\uD83C\uDFD3Latency is ".concat(Date.now() - msg.createdTimestamp, "ms. API Latency is ").concat(Math.round(client.ws.ping), "ms"));
    }
});
client.login(process.env.TOKEN);
