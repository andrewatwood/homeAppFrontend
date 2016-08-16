# homeAppFrontend
HTML/CSS replication of iOS 10's Home.app for use as a custom frontend for home automation systems.

**[Watch the latest demo](https://streamable.com/iis1)**

Support planned for Domoticz, OpenHAB, and HomeAssistant, with Domoticz in testing now.
## Requirements
- Node.js

## Installation
1. Clone repo or download zip to your server of choice
2. `cd homeAppFrontend && npm install`
3. Edit `config.json` to point to your Domoticz server, and tweak other options as you see fit *(for iOS devices, `pretty = true` will enable a blur filter that can kill smoothness on older devices, so it's off by default)*
4. If your server-side device names look like `lr_entryway_lamps` or have the room name in them like `Living Room Ceiling Fan`, you can specify custom names in `config.json`. Examples are given - just put the Domoticz name as the key (on the left) and the new name as the value (on the right). 
5. Once all dependencies are taken care of, run `npm start` inside the root folder and leave the terminal window open. Will run as a daemon soon just haven't bothered.
6. From any device on your LAN, go to `http://serverip:15155` *(or whatever port you set in config.json)* in your browser and you're all set

## Notes
- Still in early testing - only support switches (On/Off and Dimmer) so far
- Icon support so far includes fans and lightbulbs *(with lightbulb being the default)*
- Eventually will piggyback off the webservers already running for the various backends like Domoticz, HomeAssistant, and OpenHAB instead of running its own server. Just not there yet.

## Problems?
Visit the page in a desktop browser, open the developer console, and type `app.dumpServer()`, then paste the results to a either a GitHub issue or [in the Domoticz forum thread](https://www.domoticz.com/forum/viewtopic.php?p=93218#p93218) 