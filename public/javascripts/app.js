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