//Server prototypes
function Domoticz(server){
    this.server = server;
    this.rooms = {};
    this.devices = {};
    this.scenes = {};
    this.init();
}

Domoticz.prototype.init = function(){
    this.getRooms().then(this.getDevices()).then(this.getScenes()).then(function(){
        Vue.nextTick(function(){
            init();
        });
    });
}

Domoticz.prototype.getRooms = function(){
    var deferred = $.Deferred();
    var url = this.server + '/json.htm?type=plans&order=name&used=true';
    var rooms = {};
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
                        return device.DevRealIdx;
                    });
                    devices.map(function(deviceIdx){
                        var deviceRoom = this.devices[deviceIdx].location.id;
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

Domoticz.prototype.toggleDevice = function(deviceId){
    this.devices[deviceId].on = !this.devices[deviceId].on;
    this.sendCommand({
        on : this.devices[deviceId].on
    }, deviceId
    );
}

Domoticz.prototype.sendCommand = function(command, deviceId){
    if('on' in command){
        var cmd = command.on ? 'On' : 'Off';
        var url = this.server + '/json.htm?type=command&param=switchlight&idx=' + this.devices[deviceId].idx + '&switchcmd=' + cmd;
    } else if ('brightness' in command){

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


//Vue basics
var app = new Vue({
    el: '#app',
    data: {
        server : new Domoticz('http://andrews-macbook-pro.local:8080'),
        showRoomPicker : false,
        currentRoom : 2
    },
    methods: {
        toggleDevice : function(deviceId) {
            this.server.toggleDevice(deviceId);
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
        }
    }
});