function Domoticz(server){
    this.server = config.server.indexOf('http') == -1 ? 'http://' + config.server : config.server;
    this.rooms = {};
    this.devices = {};
    this.scenes = {};
    this.inProgress = false;
    this.updateInterval = config.update_interval || 30 //seconds;
    this.init();
}

Domoticz.prototype.init = function(){
    this.getRooms()
    .then(this.getDevices.bind(this))
    .then(this.getScenes.bind(this))
    .then(function(){
        Vue.nextTick(function(){
            init();
            document.getElementById('container').scrollLeft = 1;
            var firstDevice = Object.keys(app.server.devices).shift();
            app.server.devices[firstDevice] = app.server.devices[firstDevice];
            document.getElementById('container').scrollLeft = 0;
        });
    });
    setInterval(function(){ 
        this.getDevices() 
    }.bind(this), this.updateInterval * 1000)
}

Domoticz.prototype.getRooms = function(){
    var deferred = $.Deferred();
    var url = this.server + '/json.htm?type=plans&order=name&used=true';
    var defaultRoom =  {
        name : 'Default Room',
        filename : 'default',
        scenes : [],
        empty : true
    }
    var rooms = {
        0 : defaultRoom
    };
    $.get(
        url,
        function(data){
            if(data.status != 'OK'){
                deferred.reject();
                return null;
            }
            for( var i = 0; i < data.result.length; i++){
                var result = data.result[i];
                rooms[result.idx] = {
                    name : result.Name,
                    filename : result.Name.toLowerCase().replace(/\s+/g, ''),
                    scenes : [],
                    empty : true
                }
            }
            this.rooms = rooms;
            console.log('got rooms');
            deferred.resolve();
            return true;
        }.bind(this)
    );
    return deferred;
}

Domoticz.prototype.getDevices = function(){
    console.log('getting devices');
    console.log(this.rooms);
    var deferred = $.Deferred();
    var url = this.server + '/json.htm?type=devices&filter=all&used=true&order=Name';
    var devices = {};
    if(config.thermostats){
        for (var key in config.thermostats){
            devices[key] = config.thermostats[key];
            var roomId = devices[key].room_id;
            console.log(this.rooms);
            devices[key].location = this.rooms[roomId];
            console.log(devices[key]);
        }
    }
    $.get(
        url,
        function(data){
            if(data.status != 'OK'){
                deferred.reject();
                return null;
            }
            for( var i = 0; i < data.result.length; i++){
                var result = data.result[i];
                var device = {};
                var thermostat = false;
                switch (result.Type){
                    case 'Scene':
                        continue;
                    case 'Light/Switch':
                        if(result.SwitchType == 'Dimmer'){
                            device.dimmer = true;
                            device.level = result.Level;
                            device.maxLevel = result.MaxDimLevel;
                        }
                        break; 
                    case 'Thermostat':
                        device.setPoint = result.SetPoint;
                        thermostat = true;
                        break;
                    case 'Temp + Humidity':
                        device.celsius = result.Data.indexOf('F') == -1;
                        device.temperature = result.Temp;
                        console.log(result);
                        thermostat = true;
                        break
                }
                device.name = result.Name;
                device.idx = result.idx;
                device.status = result.Status;
                //Set icon type
                if(device.name.toLowerCase().indexOf('fan') > -1 || result.Image =="Fan"){
                    device.icon = 'fan';
                } else {
                    device.icon = 'lightbulb';
                }
                if(result.PlanID == "0" && !this.rooms[0]){
                    console.log('adding Default Room');
                    
                }
                if(this.rooms[result.PlanID].empty){
                    this.rooms[result.PlanID].empty = false;
                }
                device.location = this.rooms[result.PlanID];
                device.location.id = result.PlanID;
                if (device.status != 'Off'){
                    device.on = true;
                } else {
                    device.on = false;
                }
                if(thermostat){
                    for(var thermostatId in config.thermostats){
                        var thermostat = config.thermostats[thermostatId];
                        for (var prop in thermostat){
                            if (device.idx == thermostat[prop]){
                                devices[thermostatId][prop] = device;
                            }
                        }
                    }
                } else {
                    devices[device.idx] = device;
                }
            }
            this.devices = devices;
            this.inProgress = false;
            deferred.resolve();
            return true;
        }.bind(this)
    );
    return deferred;
}

Domoticz.prototype.getScenes = function(){
    var deferred = $.Deferred();
    var url = this.server + '/json.htm?type=scenes';
    var scenes = {};
    $.get(
        url,
        function(data){
            if(data.status != 'OK'){
                deferred.reject();
                return null;
            }
            for( var i = 0; i < data.result.length; i++){
                var result = data.result[i];
                if(result.Type != 'Scene'){
                    continue;
                }
                var scene = {};
                scene.name = result.Name;
                scene.on = result.Status == 'On';
                scenes[result.idx] = scene;   
            }
            this.scenes = scenes;
        }.bind(this)
    ).done(function(){
        deferred.resolve();
        var gets = [];
        $.each(this.scenes, function(key, value){
            var url = this.server + '/json.htm?type=command&param=getscenedevices&idx=' + key + '&isscene=true';
            var get = $.get(
                url,
                function(key, data){
                    var rooms = [];
                    if(data.status != 'OK' || !data.result){
                        return null;
                    }
                    var devices = data.result.map(function(device){
                        return {idx : device.DevRealIdx,
                                on : device.Command!='Off' ? true : false,
                                level : device.Level 
                            }
                    });
                    this.scenes[key].devices = devices;
                    devices.map(function(device){
                        var deviceRoom = this.devices[device.idx].location.id;
                        if(rooms.indexOf(deviceRoom) == -1){
                            rooms.push(deviceRoom);
                            this.rooms[deviceRoom].scenes.push(key);
                        }
                    }.bind(this));
                    this.scenes[key].rooms = rooms;
                    this.checkSceneStatus(key);
                }.bind(this, key)
            );
            gets.push(get);
        }.bind(this));
        return $.when(gets);
    }.bind(this));
    return deferred;
}

Domoticz.prototype.checkSceneStatus = function(sceneId){
    var match = true;
    var scene = this.scenes[sceneId];
    if(!scene.devices){
        return null;
    }
    for (var i = 0; i < scene.devices.length; i++){
        var device = scene.devices[i];
        if(this.devices[device.idx].on != device.on){
            match = false;
            break;
        }
        if('level' in this.devices[device.idx] && this.devices[device.idx].level != device.level){
            match = false;
            break;
        }
    }
    this.scenes[sceneId].on = match;
}

Domoticz.prototype.updateScenes = function(deviceId){
    var roomId = this.devices[deviceId].location.id;
    console.log('Updating for room %d', roomId);
    var scenes = this.rooms[roomId].scenes;
    scenes.map(function(sceneId){
        this.checkSceneStatus(sceneId);
    }.bind(this));
}

Domoticz.prototype.toggleDevice = function(deviceId){
    this.devices[deviceId].on = !this.devices[deviceId].on;
    this.sendCommand({ on : this.devices[deviceId].on }, deviceId);
}

Domoticz.prototype.setDeviceStatus = function(deviceId, command){
    for(var key in command){
        this.devices[deviceId][key] = command[key];
    }
    this.sendCommand(command, deviceId);
}

Domoticz.prototype.toggleScene = function(sceneId){
    if(!this.scenes[sceneId].on){
        this.scenes[sceneId].on = true;
        this.sendCommand({
            sceneOn : true,
        }, sceneId
        );
        this.scenes[sceneId].devices.map(function(device){
            var deviceId = device.idx;
            this.devices[deviceId].on = device.on;
            if('level' in this.devices[deviceId]){
                this.devices[deviceId].level = device.level;
            }
        }.bind(this));
        for(var key in this.scenes){
            this.checkSceneStatus(key);
        }
    } else {
        this.scenes[sceneId].on = false;
        var scene = this.scenes[sceneId];
        scene.devices.map(function(device){
            var command = {
                on : !device.on
            }
            this.setDeviceStatus(device.idx,command);
        }.bind(this));
    }
}

Domoticz.prototype.sendCommand = function(command, deviceId){
    if('on' in command){
        var cmd = command.on ? 'On' : 'Off';
        var url = this.server + '/json.htm?type=command&param=switchlight&idx=' + this.devices[deviceId].idx + '&switchcmd=' + cmd;
    } else if ('brightness' in command){
        var cmd;
        if(command.brightness <= 0){
            cmd = 'Off';
            this.devices[deviceId].on = false;
        } else {
            cmd = 'Set%20Level&level=' + command.brightness;
            this.devices[deviceId].on = true;
            this.devices[deviceId].level = command.brightness/100 * this.devices[deviceId].maxLevel;
        } 
        var url = this.server + '/json.htm?type=command&param=switchlight&idx=' + this.devices[deviceId].idx + '&switchcmd=' + cmd;
    } else if ('sceneOn' in command){
        var url = this.server + '/json.htm?type=command&param=switchscene&idx=' + deviceId + '&switchcmd=On';
    }
    if(url){
        $.get(
            url,
            function(data){
                console.log('Response for command on device %d',deviceId,data);
            }
        );
    }
}

Domoticz.prototype.updateDevices = function(){
    var deferred = $.Deferred();
    var url = this.server + '/json.htm?type=devices&filter=light&used=true&order=Name';
    var devices = {};
    $.get(
        url,
        function(data){
            if(data.status != 'OK'){
                deferred.reject();
                return null;
            }
            for( var i = 0; i < data.result.length; i++){
                var result = data.result[i];
                if(result.Type == 'Scene'){
                    continue
                }
                device.name = result.Name;
                device.idx = result.idx;
                device.status = result.Status;
                //Set icon type
                if(device.name.toLowerCase().indexOf('fan') > -1){
                    device.icon = 'fan';
                } else {
                    device.icon = 'lightbulb';
                }
                if(result.PlanID == 0 && !this.rooms[0]){
                    var defaultRoom = {
                        name : 'Default Room',
                        filename : 'default',
                        scenes : []
                    }
                    this.rooms[0] = defaultRoom;
                }
                //Check for dimmer
                if(result.SwitchType == 'Dimmer'){
                    device.dimmer = true;
                    device.level = result.Level;
                    device.maxLevel = result.MaxDimLevel; 
                    console.log(device);
                }
                device.location = this.rooms[result.PlanID];
                device.location.id = result.PlanID;
                if (device.status != 'Off'){
                    device.on = true;
                } else {
                    device.on = false;
                }
                devices[device.idx] = device;
            }
            this.devices = devices;
            deferred.resolve();
            return true;
        }.bind(this)
    );
    return deferred;
}