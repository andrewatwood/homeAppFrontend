var Q = require('q');
var unirest = require('unirest');

function Domoticz(server){
    this.server = server;
    this.rooms = {};
    this.devices = {};
    this.scenes = {};
}

Domoticz.prototype.init = function(){
    var deferred =  Q.defer();
    this.getRooms()
    .then(function(){
        return this.getDevices()
    }.bind(this)).then(function(){
        return this.getScenes()
    }.bind(this)).then(function(){
        return this.associateScenes()
    }.bind(this)).then(deferred.resolve);
    return deferred.promise;
}

Domoticz.prototype.getRooms = function(){
    var deferred = Q.defer();
    var url = this.server + '/json.htm?type=plans&order=name&used=true';
    var rooms = {};
    unirest.get(url)
    .end(function(response){
        if(response.body.status != 'OK'){
            deferred.reject();
            return null;
        }
        for( var i = 0; i < response.body.result.length; i++){
            var result = response.body.result[i];
            rooms[result.idx] = {
                name : result.Name,
                filename : result.Name.toLowerCase().replace(/\s+/g, ''),
                scenes : []
            }
        }
        this.rooms = rooms;
        deferred.resolve();
        console.log('rooms got');
        return true;
    }.bind(this));
    return deferred.promise;
}

Domoticz.prototype.getDevices = function(){
    var deferred = Q.defer();
    var url = this.server + '/json.htm?type=devices&filter=light&used=true&order=Name';
    var devices = {};
    unirest.get(url)
    .end(function(response){
        if(response.body.status != 'OK'){
            deferred.reject();
            return null;
        }
        for( var i = 0; i < response.body.result.length; i++){
            var result = response.body.result[i];
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
        console.log('devices got');
        return true;
    }.bind(this));
    return deferred.promise;
}

Domoticz.prototype.getScenes = function(){
    var deferred = Q.defer();
    var url = this.server + '/json.htm?type=scenes';
    var scenes = {};
    unirest.get(url)
    .end(function(response){
        if(response.body.status != 'OK'){
            deferred.reject();
            return null;
        }
        for( var i = 0; i < response.body.result.length; i++){
            var result = response.body.result[i];
            if(result.Type != 'Scene'){
                continue;
            }
            var scene = {};
            scene.name = result.Name;
            scene.on = result.Status == 'On';
            scenes[result.idx] = scene;   
        }
        this.scenes = scenes;
        console.log('scenes got');
        deferred.resolve();
    }.bind(this));
    return deferred.promise;
}

Domoticz.prototype.associateScenes = function(){
    var gets = [];
    for ( var key in this.scenes){
        var value = this.scenes[key];
        var url = this.server + '/json.htm?type=command&param=getscenedevices&idx=' + key + '&isscene=true';
        var get = Q.defer();
        unirest.get(url)
        .end(function(key, get, response){
            var rooms = [];
            if(response.body.status != 'OK' || !response.body.result){
                return null;
            }
            var devices = response.body.result.map(function(device){
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
            this.checkSceneStatus(key);
            get.resolve();
        }.bind(this, key, get));
        gets.push(get.promise);
    }
    return Q.all(gets)
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

module.exports = Domoticz;