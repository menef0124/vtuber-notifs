import * as discord from 'discord.js';
import { Intents, MessageEmbed } from 'discord.js';
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
    platform: string
    streamUrl: string,
    members: string,
    stillLive: number
};

let mentionList: Livestream[] = [];

const PREFIX: string = '$';
const POLLING_TIMER: number = 15000; //milliseconds

let hiCount = 0;

const client = new discord.Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ]
});

//Event for when the bot starts
client.on('ready', () => {
    console.log("Bot is up");
    const notifsChannel = "998203253558878228";
    //const testChannel = "995890408846536796";

    //This interval is the heart of the stream polling functionality
    let interval = setInterval(async () => {
        //Gets all livestreams that just went live
        let streamList = await pollStreams();
        //Iterates through that list of streams 
        for (let i = 0; i < streamList.length; i++) {
            let members: string[] = streamList[i].members.split(','); //Gets the list of members that should be pinged 
            let pings: string = "";
            //Adds the ping strings
            for (let j = 0; j < members.length; j++) {
                pings += `<@${members[j]}> `;
            }
            //Pings the user with the livestream link
            (client.channels.cache.get(notifsChannel) as discord.TextChannel).send(pings + `${streamList[i].name} is live!\n${streamList[i].streamUrl}`);
        }
    }, POLLING_TIMER);
});

//Whenever a user sends a message
client.on('messageCreate', async (msg) => {
    //Ignore any messages not sent to the correct channels
    if (msg.channelId != "998203253558878228" && msg.channelId != "995890408846536796") {
        return;
    }
    else {
        //Ignore any messages that are from the bot
        if (msg.author.bot) {
            return;
        }

        //Ping command
        if (msg.content.toLowerCase() === `${PREFIX}ping`) {
            msg.channel.send(`🏓Latency is ${Date.now() - msg.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
        }

        //Add command that opts you into getting notifications whenever the selected streamer is live
        if (msg.content.toLowerCase() === `${PREFIX}add` || msg.content.toLowerCase() === `${PREFIX}a`) {
            //Gets the names of all streams in the DB
            const sql = "SELECT name FROM streams";
            const streamNames = await db.all(sql);

            //Generates input prompt
            let prompt = "Reply with the selection that you'd like to get notifications from:\n";
            for (let i = 0; i < streamNames.length; i++) {
                prompt += "`" + (i + 1) + "` - " + streamNames[i].name + "\n";
            }

            //Only allows messages from the person who called the add command
            let filter = (m: any) => m.author.id === msg.author.id;

            msg.channel.send(prompt).then(() => {
                msg.channel.awaitMessages({ filter: filter, max: 1, time: 30000, errors: ['time'] }).then(async (selected) => {
                    //Gets inputted number 
                    let selection = selected.first()?.content;
                    if (typeof (selection) !== "undefined") {
                        //Only allows input that's within the number of streams in the db
                        let streamName = (parseInt(selection) - 1) < streamNames.length ? streamNames[parseInt(selection) - 1].name : null;

                        //If the input matches up with any of the streamers
                        if (streamName) {
                            let sql = "SELECT members FROM streams WHERE name = ?"
                            let members = await db.all(sql, [streamName]);
                            let memArr = members[0].members.split(','); //Splits up the array to be able to add members to the array
                            //If the author's id number isn't already opted in to the selected stream
                            if (!memArr.includes(msg.author.id)) {
                                memArr.push(msg.author.id);
                                members = memArr.join(','); //Turns array back into a comma-separated list

                                //Updates members list in the db
                                sql = "UPDATE streams SET members = ? WHERE name = ?";
                                db.run(sql, [members, streamName]);

                                //Confirmation email that the add command worked
                                msg.channel.send("✅ Success! You will now get pings whenever " + streamName + " is live!");
                            }
                            //If author's user id is found in the selected stream's list of members already
                            else {
                                msg.channel.send("Silly goose you're already getting notifications for that stream smh");
                            }

                        }
                        else {
                            //If input is not in the range of the number of 
                            msg.channel.send("Invalid input!");
                        }
                    }
                });
            });
        }


        //Silly commands
        if (msg.content.toLowerCase() === 'ping') {
            msg.reply("pong");
        }
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