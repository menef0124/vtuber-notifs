import { Livestream, db, twitch, youtube, YT_API_KEY } from "./index";
import { youtube_v3 } from 'googleapis';

//Used in confirming if a stream is live or a waiting room
const EXPECTED_START = "var ytInitialPlayerResponse = ";

let streams: Livestream[] = [];

export async function pollStreams(): Promise<Livestream[]> {
    let streamsToReturn: Livestream[] = [];
    let sql = 'SELECT * FROM streams';
    let tmp: any = await db.execute(sql);
    streams = tmp[0];

    //Iterates through entire database
    for (let i = 0; i < streams.length; i++) {
        let status = streams[i].stillLive;
        try {
            const isLive = await checkIfLive(streams[i]);
            //If the stream just went live
            if (isLive && status == 0) {
                console.log(`${streams[i].name} is now live!`);
                sql = "UPDATE streams SET stillLive = ? WHERE name = ?";
                db.execute(sql, [1, (new Date().getTime()), streams[i].name]);
                streamsToReturn.push(streams[i]);
            }
            //If the stream ping was already sent out and the stream is still going
            if (isLive && status == 1) {
                console.log(`${streams[i].name} is online`);
            }
            //If the stream is still offline
            if(!isLive && status == 0){
                console.log(`${streams[i].name} is offline`);
            }
            //If the stream went offline
            if (!isLive && status == 1) {
                console.log(`${streams[i].name} is now offline`);
                sql = "UPDATE streams SET stillLive = ? WHERE name = ?";
                db.execute(sql, [0, streams[i].name]);
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
async function checkIfLive(stream: Livestream): Promise<boolean | undefined> {

    if(stream.platform == 'youtube'){
        if(YT_API_KEY){
            const params: youtube_v3.Params$Resource$Search$List = {
                part: ["snippet"],
                channelId: stream.streamUrl.substring(stream.streamUrl.lastIndexOf('channel/')+8, stream.streamUrl.lastIndexOf('/')),
                eventType: "live",
                type: ["video"],
                key: YT_API_KEY
            }
            const res = await youtube.search.list(params);
            return res.data.items!.length > 0;
        }
    }
    else if(stream.platform == 'twitch'){
        const channelName = stream.streamUrl.substring(stream.streamUrl.lastIndexOf('/')+1);
        const res = await twitch.getStreams({channel: channelName});
        return res.data.length > 0;
    }
    else{
        return false;
    }

    /*
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
    */
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