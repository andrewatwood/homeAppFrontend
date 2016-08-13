var app = new Vue({
    el: '#app',
    data: {
        server : new Domoticz('http://localhost:8080'),
        showRoomPicker : false,
        currentRoom : 2,
        bigDevice : {
            empty : true
        }
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
            var screens = Math.abs(offset)/width;
            document.getElementById('container').scrollLeft = current+offset;
            //$('#container').animate({scrollLeft : current+offset},125*screens);
            $('#options').toggleClass('hidden');
        },
        toggleRoomPicker : function() {
            var roomWidth = $('.room-wrapper').width();
            var scrollPosition = $('#container').scrollLeft() + 10;
            roomIndex = Math.floor(scrollPosition/roomWidth);
            this.currentRoom = Object.keys(this.server.rooms)[roomIndex]
            $('#options').toggleClass('hidden')
            //this.showRoomPicker = !this.showRoomPicker;
        },
        getReadableStatus : function(device, long){
            if(device.empty){
                return '';
            }
            var status = '';
            if('dimmer' in device && device.on){
                var percent = Math.round(100*device.level/device.maxLevel);
                if(percent == 0 || percent == 100){
                    status= device.on ? 'On' : 'Off'
                } else {
                    status= percent + "%"
                }
            } else if ('setpoint' in device){
                status = 'Cooling to 80';
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
        getDimmerHeight : function(){
            if(this.bigDevice.empty){
                return '';
            }
            var id = this.bigDevice.idx;
            if(this.server.devices[id].on){
                var fraction = this.server.devices[id].level/this.server.devices[id].maxLevel;
                var totalHeight = $('.switch').height();
                return (totalHeight - 20) * fraction + 20 + 'px';
            } else {
                return '';
            }
        },
        getBigDeviceOn : function(){
            if(this.bigDevice.empty){
                return false;
            }
            return this.server.devices[this.bigDevice.idx].on;
        },
        getDeviceIcon : function(deviceId){
            if(deviceId === undefined){
                return '';
            }
            var icon = '/images/icons/'
            var device = this.server.devices[deviceId];
            if(device.on){
                icon = icon + device.icon + '.svg';
            } else {
                icon = icon + device.icon + '-inactive.svg';
            }
            return icon;
        },
        showDeviceControl : function(deviceId){
            var device = this.server.devices[deviceId];
            this.bigDevice.on = device.on
            this.bigDevice = device;
            $('#big-control').removeClass('hidden');
        },
        refreshDevices : function(){
            this.server.getDevices();
        }
    }
});

Vue.filter('displayName', function(value){
    if(config.display_names && (value in config.display_names)){
        return config.display_names[value];
    } else {
        return value;
    }
});