import { Livestream, db, admin } from "./index";
import mysql from "mysql2/promise";

export async function getStreamStatuses(userId: string): Promise<string> {
    //Gets all streams that user is opted into
    mysql.escape(userId);
    let sql = `SELECT * FROM streams${(admin === 1 && userId === "308629810085625878") ? "" : ` WHERE members like '%${userId}%'`}`;
    let tmp: any = await db.execute(sql);
    let optedStreams: Livestream[] = tmp[0];

    //Starts building response message
    let res = "Current status of your streams:\n";

    //Outputs the name then adds if they are live or not
    for (let i = 0; i < optedStreams.length; i++) {
        res += optedStreams[i].name + " - ";
        if (optedStreams[i].stillLive == 1) {
            res += `Live - <${optedStreams[i].streamUrl}>\n`;
        }
        else {
            res += "Offline\n"
        }
    }

    return res;
}