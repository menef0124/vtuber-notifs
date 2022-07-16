import * as discord from 'discord.js';
import { Intents } from 'discord.js';
import * as dotenv from 'dotenv';
import { pollStreams } from './polling';
import * as sqlite3 from 'sqlite3';
import { open } from 'sqlite';
dotenv.config();

let db: any;
(async () => {
    // open the database
    db = await open({
        filename: './vtubers.sqlite',
        driver: sqlite3.Database
    });
})();

export type Livestream = {
    name: string,
    streamUrl: string,
    members: string,
    stillLive: number
};

let mentionList: Livestream[] = [];

const PREFIX: string = '$';
const POLLING_TIMER: number = 10000; //milliseconds

let hiCount = 0;

const client = new discord.Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ]
});

client.on('ready', () => {
    console.log("Bot is up");
    const notifsChannel = "996167357313601607";
    //const testChannel = "995890408846536796";
    let interval = setInterval(async () => {
        let streamList = await pollStreams();
        for (let i = 0; i < streamList.length; i++) {
            let members: string[] = streamList[i].members.split(',');
            let pings: string = "";
            for (let j = 0; j < members.length; j++) {
                pings += `<@${members[j]}> `;
            }
            (client.channels.cache.get(notifsChannel) as discord.TextChannel).send(pings + `${streamList[i].name} is live!\n${streamList[i].streamUrl}`);
        }
    }, POLLING_TIMER);
});

client.on('messageCreate', (msg) => {
    if (msg.channelId != "996167357313601607" && msg.channelId != "995890408846536796") {
        return;
    }
    else {
        //Don't react to messages if they're from the bot
        if (msg.author.bot) {
            return;
        }

        //Silly ping command
        if (msg.content.toLowerCase() === 'ping') {
            msg.reply("pong");
        }

        //Ping command
        if (msg.content.toLowerCase() === `${PREFIX}ping`) {
            msg.channel.send(`🏓Latency is ${Date.now() - msg.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
        }

        //Silly hi if hi is sent 3 times
        if (msg.content.toLowerCase() == 'hi') {
            hiCount++;
            if (hiCount >= 3) {
                msg.channel.send("hi :)");
                hiCount = 0;
            }
        }
        if (msg.content.toLowerCase() != 'hi') {
            hiCount = 0;
        }
    }

});

client.login(process.env.TOKEN);