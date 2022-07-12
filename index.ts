import * as discord from 'discord.js';
import { Intents } from 'discord.js';
import * as dotenv from 'dotenv';
dotenv.config();

const PREFIX = '$';

const client = new discord.Client({
    intents:[
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ]
});

client.on('ready', () => {
    console.log("Bot is ready");
});

client.on('messageCreate', (msg) => {
    if(msg.content === `${PREFIX}ping`){
        msg.channel.send(`🏓Latency is ${Date.now() - msg.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
    }
});

client.login(process.env.TOKEN);