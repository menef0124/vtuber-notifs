import { Livestream } from "./index";
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db: any;
(async () => {
    // open the database
    db = await open({
      filename: './vtubers.sqlite',
      driver: sqlite3.Database
    });
})();

let streams: Livestream[] = [];

export async function pollStreams(): Promise<Livestream[]>{
    const sql = 'SELECT * FROM streams';
    streams = await db.all(sql);

    return streams;
}