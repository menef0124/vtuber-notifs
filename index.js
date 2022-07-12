"use strict";
exports.__esModule = true;
var discord = require("discord.js");
var discord_js_1 = require("discord.js");
var dotenv = require("dotenv");
dotenv.config();
var PREFIX = '$';
var hiCount = 0;
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
    if (msg.author.bot) {
        return;
    }
    //Ping command
    if (msg.content.toLowerCase() === "".concat(PREFIX, "ping")) {
        msg.channel.send("\uD83C\uDFD3Latency is ".concat(Date.now() - msg.createdTimestamp, "ms. API Latency is ").concat(Math.round(client.ws.ping), "ms"));
    }
    //Silly hi if hi is sent 3 times
    if (msg.content.toLowerCase() == 'hi') {
        console.log('hi detected');
        hiCount++;
        if (hiCount >= 3) {
            console.log("should send hi");
            msg.channel.send("hi :)");
            hiCount = 0;
        }
    }
    if (msg.content.toLowerCase() != 'hi') {
        console.log('non-hi detected');
        hiCount = 0;
    }
});
client.login(process.env.TOKEN);
