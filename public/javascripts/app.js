function Domoticz(server){
    this.server = server;
    this.rooms = {};
}

Domoticz.prototype.init = function(){
    return this.getRooms();
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
                rooms[result.idx] = result.Name;
            }
            console.log(rooms);
            this.rooms = rooms;
            console.log(this.rooms);
            deferred.resolve();
            return true;
        }
    )
    return deferred;
}

var domoticz = new Domoticz('http://localhost:8080');
domoticz.init().then(function(){
    console.log(domoticz);
});

new Vue({
    el: '#app',
    data: {
        state : {},
        devices : {
            '1' : {
                name : 'Lamp',
                location : 'Bedroom',
                on : true
            },
            '2' : {
                name : 'Fan',
                location : 'Bedroom',
                on : false
            }
        },
        rooms : []
    },
    methods: {
        toggleDevice : function(deviceId) {
            this.devices[deviceId].on = !this.devices[deviceId].on;
        }
    }
});