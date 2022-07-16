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

const EXPECTED_START = "var ytInitialPlayerResponse = ";

let streams: Livestream[] = [];

export async function pollStreams(): Promise<Livestream[]> {
    let streamsToReturn: Livestream[] = [];
    let sql = 'SELECT * FROM streams';
    streams = await db.all(sql);
    for (let i = 0; i < streams.length; i++) {
        let status = streams[i].stillLive;
        try {
            const res = await fetch(streams[i].streamUrl);
            const ytHtml = await res.text();
            if (checkIfLive(ytHtml) && status == 0) {
                console.log(`${streams[i].name} is now live!`);
                sql = "UPDATE streams SET stillLive = ? WHERE id = ?";
                db.run(sql, [1, i + 1])
                streamsToReturn.push(streams[i]);
            }
            if (checkIfLive(ytHtml) && status == 1) {
                console.log(`${streams[i].name} is online`);
            }
            if (!checkIfLive(ytHtml)) {
                console.log(`${streams[i].name} is offline`);
                sql = "UPDATE streams SET stillLive = ? WHERE id = ?";
                db.run(sql, [0, i + 1]);
            }
        }
        catch (e) {
            console.log("There was an error", e);
            continue;
        }
    }
    console.log("-------------------------------------------");
    return streamsToReturn;
}

function checkIfLive(html: string): boolean {
    const dom = parse(html, {
        blockTextElements: {
            script: true,
            noscript: false,
            style: false,
            pre: false
        }
    });

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

    const videoDetails = playerInfo.videoDetails;
    if (videoDetails?.isLiveContent && !videoDetails?.isUpcoming) {
        return true;
    }

    return false;
}

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