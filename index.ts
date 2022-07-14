import * as discord from 'discord.js';
import { Intents } from 'discord.js';
import * as dotenv from 'dotenv';
import { pollStreams } from './polling';
dotenv.config();

export type Livestream = {
    roleId: "string",
    streamUrl: "string"
};

let streamList: Livestream[] = [];

const PREFIX: string = '$';
const POLLING_TIMER: number = 600000; //milliseconds

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
    console.log("Bot is up");
    let interval = setInterval( () => {
        streamList = pollStreams();
        for(let i = 0; i < streamList.length; i++){
            (client.channels.cache.get("996167357313601607") as discord.TextChannel).send(`<@&${streamList[i].roleId}> ` + `${streamList[i].streamUrl}`);
        }
        //(client.channels.cache.get("996167357313601607") as discord.TextChannel).send("<@&996968087880478751> " + "https://www.youtube.com/watch?v=v6X43Mv1Q3Q");
    }, POLLING_TIMER);
});

client.on('messageCreate', (msg) => {
    if(msg.channelId != "996167357313601607" && msg.channelId != "995890408846536796"){
        return;
    }
    else{
        //Don't react to messages if they're from the bot
        if(msg.author.bot){
            return;
        }

        //Silly ping command
        if(msg.content.toLowerCase() === 'ping'){
            msg.reply("pong");
        }

        //Ping command
        if(msg.content.toLowerCase() === `${PREFIX}ping`){
            msg.channel.send(`🏓Latency is ${Date.now() - msg.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
        }

        //Silly hi if hi is sent 3 times
        if(msg.content.toLowerCase() == 'hi'){
            hiCount++;
            if(hiCount >= 3){
                msg.channel.send("hi :)");
                hiCount = 0;
            }
        }
        if(msg.content.toLowerCase() != 'hi'){
            hiCount = 0;
        }
    }

});

client.login(process.env.TOKEN);