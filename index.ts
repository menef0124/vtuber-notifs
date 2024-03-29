import * as discord from 'discord.js';
import { Intents } from 'discord.js';
import TwitchApi from 'node-twitch';
import * as dotenv from 'dotenv';
import { pollStreams } from './polling';
import { getStreamStatuses } from './status'
import mysql from "mysql2/promise";
dotenv.config();

export let db: any;
(async () => {
    // open the database
    db = await mysql.createConnection({
        host: process.env.HOST,
        user: process.env.DBUSR,
        password: process.env.DBPW,
        database: process.env.DB
    });
})();

export let twitch: any;
if(process.env.TWITCHID && process.env.TWITCHSEC){
    twitch = new TwitchApi({
        client_id: process.env.TWITCHID,
        client_secret: process.env.TWITCHSEC 
    });
}

export type Livestream = {
    name: string,
    platform: string
    streamUrl: string,
    members: string,
    stillLive: number
};

let mentionList: Livestream[] = [];

const PREFIX: string = '$';
const POLLING_TIMER: number = 30000; //milliseconds
//const CLEAR_TIMER: number = 86400000;
const TIMER: number = 30000;
const NOTIFS_CHANNEL = "1017332176422961203";

let timeLast = new Date().getDate();
let timeNow = 1;
let hiCount = 0;
export let admin = 0;

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


    //Clear chat
    async function clear(){
        const channel = (client.channels.cache.get(NOTIFS_CHANNEL) as discord.TextChannel);
        const fetched = await channel.messages.fetch({limit: 99});
        channel.bulkDelete(fetched, true).catch((err) => console.log("All old messages deleted already"));
    }

    //Clears past 100 messages sent within the past 2 weeks in the notifs channel every 24 hours
    let clearInt = setInterval(async () =>{
        timeNow = new Date().getDate();
        if(timeLast == timeNow){
            //Do nothing if it's still the same day
        }
        else{
            //Clear notifs channel and update timeLast
            clear();
            timeLast = timeNow;
        }
    }, TIMER);

    //This interval is the heart of the stream polling functionality
    let mainInt = setInterval(async () => {
        //Gets all livestreams that just went live
        let streamList = await pollStreams();
        //Iterates through that list of streams 
        for (let i = 0; i < streamList.length; i++) {
            let members: string[] = streamList[i].members.split(','); //Gets the list of members that should be pinged 
            if (members.length == 0 || members[0] == '')
                continue;
            let pings: string = "";
            //Adds the ping strings
            pings += admin === 0 ? "" : "<@308629810085625878>";
            for (let j = 0; j < members.length; j++) {
                pings += `<@${members[j]}> `;
            }
            //Pings the user with the livestream link
            (client.channels.cache.get(NOTIFS_CHANNEL) as discord.TextChannel).send(pings + `${streamList[i].name} is live on ${streamList[i].platform}!\n${streamList[i].streamUrl}`);
        }
    }, POLLING_TIMER);
});

//Whenever a user sends a message
client.on('messageCreate', async (msg) => {
    //Ignore any messages that are from the bot
    if (msg.author.bot) {
        return;
    }

    //Ignore any messages not sent to the correct channels
    if (msg.channelId != NOTIFS_CHANNEL) {
        return;
    }
    else {

        //Toggle admin mode
        if(msg.content.toLowerCase() === `${PREFIX}debug` || msg.content.toLowerCase() === `${PREFIX}d` && msg.author.id === "308629810085625878"){
            admin = admin === 0 ? 1 : 0;
            msg.channel.send(`Debug mode is now ${admin === 0 ? "off!" : "on!"}`).then(msg => {setTimeout(() => msg.delete().catch((err) => console.log("Message already deleted")), 10000)});
            msg.delete().catch((err) => console.log("Message already deleted"));

        }

        //Ping command
        if (msg.content.toLowerCase() === `${PREFIX}ping`) {
            msg.channel.send(`🏓Latency is ${Date.now() - msg.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
        }

        //Help command for displaying all of the available commands
        if(msg.content.toLowerCase() === `${PREFIX}help` || msg.content.toLowerCase() === `${PREFIX}h`){
            msg.reply("Prefix for all commands: `$`\n`status` or `s` - Displays all streams that you're opted into notifications for.\n`add` or `a` - Lists all streamers in the database to opt into notifications for. You can also add new streams to the database.\n`remove` or `r` - Allows you to select a streamer to opt out of notifications for.");
            msg.delete().catch((err) => console.log("Message already deleted"));
        }

        //Status command that lists the streaming status of all streams the that user has opted into notifs for
        if (msg.content.toLowerCase() === `${PREFIX}status` || msg.content.toLowerCase() === `${PREFIX}s`) {
            msg.channel.send(await getStreamStatuses(msg.author.id)).then(msg => {setTimeout(() => msg.delete().catch((err) => console.log("Message already deleted")), 20000)});
            msg.delete().catch((err) => console.log("Message already deleted"));
        }


        //Add command that opts you into getting notifications whenever the selected streamer is live
        if (msg.content.toLowerCase() === `${PREFIX}add` || msg.content.toLowerCase() === `${PREFIX}a`) {
            //Gets the names of all streams in the DB
            const sql = "SELECT name, platform FROM streams";
            const tmp = await db.execute(sql);
            const streamNames = tmp[0];

            

            //Generates input prompt
            let prompt = "Reply with the selection that you'd like to get notifications from:\n`0` - Add new stream!\n";
            for (let i = 0; i < streamNames.length; i++) {
                prompt += "`" + (i + 1) + "` - " + streamNames[i].name + " (" + (streamNames[i].platform == "youtube" ? "YouTube" : "Twitch") + ")\n";
            }

            //Only allows messages from the person who called the add command
            let filter = (m: any) => m.author.id === msg.author.id;

            msg.channel.send(prompt).then((m) => {
                msg.channel.awaitMessages({ filter: filter, max: 1, time: 60000, errors: ['time'] }).then(async (selected) => {
                    m.delete().catch((err) => console.log("Message already deleted"));
                    //Gets inputted number 
                    let selection = selected.first()?.content;
                    selected.last()?.delete().catch((err) => console.log("Message already deleted"));
                    if (typeof (selection) !== "undefined") {
                        if(selection == "0"){
                            msg.channel.send("What's the name of the streamer?").then((m) => {
                                msg.channel.awaitMessages({filter: filter, max: 1, time: 60000, errors: ['time']}).then(async (name) => {
                                    m.delete().catch((err) => console.log("Message already deleted"));
                                    let streamer = name.first()?.content;
                                    name.last()?.delete();
                                    if(typeof(streamer) !== "undefined"){
                                        msg.channel.send("What's their stream URL?\n(For YouTube, the url format is https://www.youtube.com/channel/<channelID>/live and for Twitch it's https://www.twitch.tv/<channelName>").then((m) => {
                                            msg.channel.awaitMessages({filter: filter, max: 1, time:60000, errors: ['time']}).then(async (url) => {
                                                m.delete().catch((err) => console.log("Message already deleted"));
                                                let platform = url.first()?.content.includes("youtube") ? "youtube" : "twitch";
                                                let streamUrl = url.first()?.content;
                                                url.last()?.delete().catch((err) => console.log("Message already deleted"));
                                                let sql = "INSERT INTO streams(name,platform,streamUrl,members,stillLive) VALUES (?,?,?,?,0)";
                                                db.execute(sql, [streamer, platform, streamUrl, msg.author.id]);
                                                msg.channel.send("✅ Success! " + streamer + " has been added and you will now get pings whenever they go live!").then(msg => {setTimeout(() => msg.delete().catch((err) => console.log("Message already deleted")), 10000)});

                                            });
                                            setTimeout(async () => await m.delete().catch((err) => console.log("Message already deleted")), 30000);
                                        });
                                    }
                                });
                                setTimeout(async () => await m.delete().catch((err) => console.log("Message already deleted")), 30000);
                            });
                        }
                        else{
                            //Only allows input that's within the number of streams in the db
                            let streamer = (parseInt(selection) - 1) < streamNames.length ? streamNames[parseInt(selection) - 1] : null;
    
                            //If the input matches up with any of the streamers
                            if (streamer) {
                                let sql = "SELECT members FROM streams WHERE name = ? AND platform = ?"
                                let tmp = await db.execute(sql, [streamer.name, streamer.platform]);
                                let members = tmp[0];
                                let memArr = members[0].members.split(','); //Splits up the array to be able to add members to the array
                                //If the author's id number isn't already opted in to the selected stream
                                if (!memArr.includes(msg.author.id)) {
                                    if(memArr[0] == ""){
                                        memArr[0] = msg.author.id;
                                    }
                                    else{
                                        memArr.push(msg.author.id);
                                    }
                                    members = memArr.join(','); //Turns array back into a comma-separated list
    
                                    //Updates members list in the db
                                    sql = "UPDATE streams SET members = ? WHERE name = ? AND platform = ?";
                                    db.execute(sql, [members, streamer.name, streamer.platform]);
    
                                    //Confirmation message that the add command worked
                                    msg.channel.send("✅ Success! You will now get pings whenever " + streamer.name + " is live!").then(msg => {setTimeout(() => msg.delete(), 10000)});
                                }
                                //If author's user id is found in the selected stream's list of members already
                                else {
                                    msg.channel.send("Silly goose you're already getting notifications for that stream smh").then(msg => {setTimeout(() => msg.delete(), 10000)});
                                }
    
                            }
                            else {
                                //If input is not in the range of the number of 
                                msg.channel.send("Invalid input!").then(msg => {setTimeout(() => msg.delete(), 10000)});
                            }
                        }
                    }
                });
                setTimeout(async () => await m.delete().catch((err) => console.log("Message already deleted")), 30000);
            });
            msg.delete().catch((err) => console.log("Message already deleted"));
        }

        //Remove command that opts the user out of notifications from a streamer
        if (msg.content.toLowerCase() === `${PREFIX}remove` || msg.content.toLowerCase() === `${PREFIX}r`) {
            mysql.escape(msg.author.id);
            let sql = `SELECT name, platform, members FROM streams WHERE members like '%${msg.author.id}%'`; //Only selects streams that the user is getting notifications from
            let tmp = await db.execute(sql);
            let streams = tmp[0];

            //Begin building prompt
            let prompt = "Reply with which stream you'd like to opt out of notifications for:\n";

            for (let i = 0; i < streams.length; i++) {
                prompt += '`' + (i + 1) + '` - ' + streams[i].name + " (" + (streams[i].platform == "youtube" ? "YouTube" : "Twitch") + ')\n';
            }

            let filter = (m: any) => m.author.id === msg.author.id;

            //Sends prompt then waits for the next input from the user
            msg.channel.send(prompt).then((m) => {
                msg.channel.awaitMessages({ filter: filter, max: 1, time: 30000, errors: ['time'] }).then(async (selected) => {
                    m.delete();
                    //Gets inputted number 
                    let selection = selected.first()?.content;
                    selected.last()?.delete().catch((err) => console.log("Message already deleted"));
                    if (typeof (selection) !== "undefined") {
                        //Only allows input that's within the number of streams in the user's subscriptions
                        let streamer = (parseInt(selection) - 1) < streams.length ? streams[parseInt(selection) - 1] : null;

                        //If the input matches up with any of the streamers
                        if (streamer) {
                            sql = "SELECT members FROM streams WHERE name = ? AND platform = ?"
                            let tmp = await db.execute(sql, [streamer.name, streamer.platform]);
                            let members = tmp[0];
                            let memArr = members[0].members.split(','); //Splits up the array to be able to remove members from the array
                            //If the author's id number is already opted in to the selected stream
                            if (memArr.includes(msg.author.id)) {
                                members = memArr.filter((mem: string) => mem != msg.author.id).join(','); //Removes member from list then turns array back into a comma-separated list
                                if (members != "") {
                                    //Updates members list in the db
                                    sql = "UPDATE streams SET members = ? WHERE name = ? AND platform = ?";
                                    db.execute(sql, [members, streamer.name, streamer.platform]);
                                    //Confirmation message that the remove command worked
                                    msg.channel.send("✅ Success! You will no longer get any pings whenever " + streamer.name + " is live!").then(msg => {setTimeout(() => msg.delete().catch((err) => console.log("Message already deleted")), 10000)});
                                }
                                else {
                                    sql = "UPDATE streams SET members = ? WHERE name = ? AND platform = ?";
                                    db.execute(sql, [members, streamer.name, streamer.platform]);
                                    msg.channel.send("✅ Success! You will no longer get any pings whenever " + streamer.name + " is live!\nAll members have opted out of pings for " + streamer.name + ", no longer sending pings for their stream.").then(msg => {setTimeout(() => msg.delete().catch((err) => console.log("Message already deleted")), 10000)});
                                }
                            }
                            //If author's user id is found in the selected stream's list of members already
                            else {
                                msg.channel.send("Invalid input!").then(msg => {setTimeout(() => msg.delete().catch((err) => console.log("Message already deleted")), 10000)});
                            }

                        }
                        else {
                            //If input is not in the range of the number of 
                            msg.channel.send("Invalid input!").then(msg => {setTimeout(() => msg.delete().catch((err) => console.log("Message already deleted")), 10000)});
                        }
                    }
                });
                setTimeout(async () => await m.delete().catch((err) => console.log("Message already deleted")), 30000);
            });
            msg.delete().catch((err) => console.log("Message already deleted"));
        }


        //Silly commands
        if (msg.content.toLowerCase() === 'ping') {
            msg.reply("pong").then(msg => {setTimeout(() => msg.delete().catch((err) => console.log("Message already deleted")), 10000)});
        }

    }

    //More silly commands
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
    if(msg.mentions.has(client.user!)){
        msg.reply({files:["./static/2.jpg"]});
    }

});

client.login(process.env.TOKEN);