//Server prototypes
function Domoticz(server){
    this.server = server;
    this.rooms = {};
    this.devices = {};
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
                    name : result.Name
                }
            }
            this.rooms = rooms;
            console.log(this);
            deferred.resolve();
            return true;
        }.bind(this)
    );
    return deferred;
}

Domoticz.prototype.getDevices = function(){
    var deferred = $.Deferred();
    var url = this.server + '/json.htm?type=devices&filter=all&used=true&order=Name';
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
                var device = {};
                device.name = result.Name;
                device.idx = result.idx;
                device.status = result.Status;
                device.locationId = result.PlanID;
                device.location = this.rooms[result.PlanID];
                if (device.status != 'Off'){
                    device.on = true;
                } else {
                    device.on = false;
                }
                devices[result.ID] = device;
            }
            this.devices = devices;
            console.log(this);
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
        console.log(this);
        $.each(this.scenes, function(key, value){
            console.log('Looping scenes: key %s value %s', key, value);
/*            var get = $.get(
                url,
                function(data){

                }.bind(this)
            )*/
        }.bind(this));
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
        room : 2
    },
    methods: {
        toggleDevice : function(deviceId) {
            this.server.toggleDevice(deviceId);
        },
        setRoom : function(roomId) {
            this.room = roomId;
        },
        toggleRoomPicker : function() {
            this.showRoomPicker = !this.showRoomPicker;
        }
    }
});