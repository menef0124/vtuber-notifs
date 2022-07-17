import { Livestream } from "./index";
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fetch from "node-fetch";
import { parse } from 'node-html-parser';

let db: any;
(async () => {
    // open the database
    db = await open({
        filename: './vtubers.sqlite',
        driver: sqlite3.Database
    });
})();

//Used in confirming if a stream is live or a waiting room
const EXPECTED_START = "var ytInitialPlayerResponse = ";

let streams: Livestream[] = [];

export async function pollStreams(): Promise<Livestream[]> {
    let streamsToReturn: Livestream[] = [];
    let sql = 'SELECT * FROM streams';
    streams = await db.all(sql);

    //Iterates through entire database
    for (let i = 0; i < streams.length; i++) {
        let status = streams[i].stillLive;
        let platform = streams[i].platform;
        try {
            //Get HTML reponse that's returned by the stream URL
            const res = await fetch(streams[i].streamUrl);
            //YouTube streams only
            if (platform == "youtube") {
                const ytHtml = await res.text();
                //If the stream just went live
                if (checkIfLive(ytHtml, platform) && status == 0) {
                    console.log(`${streams[i].name} is now live!`);
                    sql = "UPDATE streams SET stillLive = ? WHERE name = ?";
                    db.run(sql, [1, streams[i].name])
                    streamsToReturn.push(streams[i]);
                }
                //If the stream ping was already sent out and the stream is still going
                if (checkIfLive(ytHtml, platform) && status == 1) {
                    console.log(`${streams[i].name} is online`);
                }
                //If the stream is offline
                if (!checkIfLive(ytHtml, platform)) {
                    console.log(`${streams[i].name} is offline`);
                    sql = "UPDATE streams SET stillLive = ? WHERE name = ?";
                    db.run(sql, [0, streams[i].name]);
                }
            }
            //Twitch streams only
            if (platform == "twitch") {
                //Twitch's HTML response for a channel already comes with a variable that Twitch only returns if that channel is live
                let isLive = (await res.text()).includes('isLiveBroadcast');
                //If stream just went live
                if (isLive && status == 0) {
                    console.log(`${streams[i].name} is now live!`);
                    sql = "UPDATE streams SET stillLive = ? WHERE name = ?";
                    db.run(sql, [1, streams[i].name])
                    streamsToReturn.push(streams[i]);
                }
                //If stream is still live and the ping was already sent out
                if (isLive && status == 1) {
                    console.log(`${streams[i].name} is online`);
                }
                //If the stream is offline
                if (!isLive) {
                    console.log(`${streams[i].name} is offline`);
                    sql = "UPDATE streams SET stillLive = ? WHERE name = ?";
                    db.run(sql, [0, streams[i].name]);
                }
            }
        }
        catch (e) {
            console.log("There was an error", e);
            continue;
        }
    }
    console.log("-------------------------------------------"); //Interval separator for logs
    return streamsToReturn;
}

//Digs through the HTML that youtube returns to see if the channel is live
function checkIfLive(html: string, plat: string): boolean {
    //Split up the HTML
    const dom = parse(html, {
        blockTextElements: {
            script: true,
            noscript: false,
            style: false,
            pre: false
        }
    });

    //Get the scripts in the HTML and finds the one that matches the video player
    const scripts = dom.querySelectorAll("script");
    let playerInfo = null;
    for (let i = 0; i < scripts.length; i++) {
        const text = scripts[i].textContent;
        if (text.startsWith(EXPECTED_START) && (playerInfo = initialPlayerResponse(scripts[i].textContent))) {
            break;
        }
    }

    if (!playerInfo) {
        return false;
    }

    //If the player is live content, return true
    const videoDetails = playerInfo.videoDetails;
    if (videoDetails?.isLiveContent && !videoDetails?.isUpcoming) {
        return true;
    }

    return false;
}

//Idk some shit from the imissfauna.com repo
function initialPlayerResponse(script: string): any {
    let idxs = Array.from(script.matchAll(/;/g), (m) => m.index);
    for (let i = idxs.length - 1; i >= 0; i--) {
        try {
            return JSON.parse(script.substring(EXPECTED_START.length, idxs[i]));
        }
        catch {
        }
    }
}