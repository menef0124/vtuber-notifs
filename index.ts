import * as discord from 'discord.js';
import { Intents } from 'discord.js';
import * as dotenv from 'dotenv';
dotenv.config();

const PREFIX = '$';

let hiCount = 0;

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
    //Ping command
    if(msg.content.toLowerCase() === `${PREFIX}ping`){
        msg.channel.send(`🏓Latency is ${Date.now() - msg.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
    }

    //Silly hi if hi is sent 3 times
    if(msg.content.toLowerCase() === 'hi'){
        hiCount++;
        if(hiCount >= 3){
            msg.channel.send("hi :)");
            hiCount = 0;
        }
    }
    if(msg.content.toLowerCase() !== 'hi'){
        hiCount = 0;
    }
});

client.login(process.env.TOKEN);