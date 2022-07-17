import { Livestream, db } from "./index";

export async function getStreamStatuses(userId: string): Promise<string>{
    //Gets all streams that user is opted into
    let sql = "SELECT * FROM streams WHERE members like '%' || ? || '%'";
    let optedStreams = await db.all(sql, [userId]);

    //Starts building response message
    let res = "Current status of your streams:\n";

    //Outputs the name then adds if they are live or not
    for(let i = 0; i < optedStreams.length; i++){
        res += optedStreams[i].name + " - ";
        if(optedStreams[i].stillLive == 1){
            res += "Live\n";
        }
        else{
            res += "Offline\n"
        }
    }

    return res;
}