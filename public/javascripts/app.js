//Server prototypes
function Domoticz(server){
    this.server = server;
    this.rooms = {};
    this.devices = {};
    this.scenes = {};
    this.inProgress = false;
    this.updateInterval = 5 //seconds;
    this.init();
}

Domoticz.prototype.init = function(){
    this.getRooms().then(this.getDevices()).then(this.getScenes()).then(function(){
        Vue.nextTick(function(){
            init();
        });
    });
    setInterval(function(){ 
        this.getDevices() 
    }.bind(this), this.updateInterval * 1000)
}

Domoticz.prototype.getRooms = function(){
    var deferred = $.Deferred();
    var url = this.server + '/json.htm?type=plans&order=name&used=true';
    var rooms = {
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
                    scenes : []
                }
            }
            this.rooms = rooms;
            deferred.resolve();
            return true;
        }.bind(this)
    );
    return deferred;
}

Domoticz.prototype.getDevices = function(){
    this.inProgress = true;
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
                var device = {};
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
                                on : device.Command!='Off' ? true : false }
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
    this.sendCommand({
        on : this.devices[deviceId].on
    }, deviceId
    );
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

    } else if ('sceneOn' in command){
        var url = this.server + '/json.htm?type=command&param=switchlight&idx=' + deviceId + '&switchcmd=On';
    }
    if(url){
        console.log(url);
        $.get(
            url,
            function(data){
                console.log(data);
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


//Vue basics
var app = new Vue({
    el: '#app',
    data: {
        server : new Domoticz('http://192.168.0.51:8080'),
        showRoomPicker : false,
        currentRoom : 2,
        bigDevice : {}
    },
    methods: {
        toggleDevice : function(deviceId) {
            console.log('toggle device %d', deviceId);
            this.server.toggleDevice(deviceId);
            this.server.updateScenes(deviceId);
        },
        toggleScene : function(sceneId) {
            this.server.toggleScene(sceneId);
        },
        setRoom : function(roomId) {
            this.currentRoom = roomId;
            var room = '[room="' + this.server.rooms[roomId].name + '"]';
            this.showRoomPicker = false;
            var width = $('.scroll').width();
            var current = $('#container').scrollLeft();
            var offset = $(room).offset().left;
            console.log('Target offset: %d current position: %d', offset, current);
            var screens = Math.abs(offset)/width;
            $('#container').animate({scrollLeft : current+offset},125*screens);
            $('#options').toggleClass('hidden');
        },
        toggleRoomPicker : function() {
            $('#options').toggleClass('hidden')
            //this.showRoomPicker = !this.showRoomPicker;
        },
        filterScenes : function(scenes, id){
        },
        getReadableStatus : function(device, long=false){
            var status = '';
            if(device.dimmer && device.on){
                var percent = Math.round(100*device.level/device.maxLevel);
                console.log('dimmer: %d', percent)
                if(percent == 0 || percent == 100){
                    status= device.on ? 'On' : 'Off'
                } else {
                    status= percent + "%"
                }
            } else {
                status= device.on ? 'On' : 'Off'
            }
            if(long){
                if(status.indexOf('%') > -1){
                    status = 'Set to ' + status; 
                } else {
                    status = 'Powered ' + status;
                }
            }
            return status;
        },
        showDeviceControl : function(deviceId){
            var device = this.server.devices[deviceId];
            this.bigDevice.on = device.on
            console.log('set %d to bigDevice', deviceId)
            this.bigDevice = device;
            $('#big-control').removeClass('hidden');
        },
        refreshDevices : function(){
            this.server.getDevices();
        }
    }
});