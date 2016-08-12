# homeAppFrontend
HTML/CSS replication of iOS 10's Home.app for use as a custom frontend for home automation systems
## Requirements
- Node.js

## Installation
1. Clone repo or download zip to your server of choice
2. `cd homeAppFrontend && npm install`
3. Edit `config.json` to point to your Domoticz server, and tweak other options as you see fit *(for iOS devices, `pretty = true` will enable a blur filter that can kill smoothness on older devices, so it's off by default)*
4. Once all dependencies are taken care of, run `npm start` inside the root folder and leave the terminal window open. Will run as a daemon soon just haven't bothered.
5. From any device on your LAN, go to `http://serverip:3000` in your browser and you're all set

## Notes
- Still in early testing - only support switches (On/Off and Dimmer) so far
- Icon support so far includes fans and lightbulbs *(with lightbulb being the default)*
- Eventually will piggyback off the webservers already running for the various backends like Domoticz, HomeAssistant, and OpenHAB instead of running its own server. Just not there yet.