# vtuber-notifs
Discord Bot that notifies users that their favorite streamers (primarily VTubers) are live.

Small personal project that I used to help self-teach myself TypeScript and deploying my own applications to a prodcuction envrionment.

## Tech Stack
---
- Node.js
  - TypeScript
  - Discord.js
  - MySQL as the database engine (DB hosted on AWS)

## Current Features
---
- (Primary feature) Polls the livestreams of multiple streamers (YouTube and Twitch) and sends Discord notifications to users that are opted in to the notifications of a specific streamer that they've gone live.
- A status command that lists the current status of all livestreams that the user has opted in to notifications for from the bot.
- An opt in command that allows the user to select a livestream to begin receiving notifications for from the bot.
- An opt out command that allows the user to select a livestream to stop receiving notifications for from the bot.

## Planned Things to Work On
---
- (End goal) The text channels that the bot sends notification messages to is currently hardcoded since it's only used in one server, so I'd like to make that dynamic so that the bot can be possibly shared with other servers.
- The text channels that the bot send messages to are pretty cluttered due to the bot not deleting its previous messages (be they notifications or reponses to the add and remove commands), so some bot message cleanup would make things neater
- When adding a new stream to the bot's database, the bot doesn't show the user what they entered to verify that the info is correct before adding it to the DB, so having that would be great.
- Better polling for Twitch streams. It works, but I had to add some weird logic to because before I did the bot would spam notifications for a stream that already went live.
- General code cleanup
