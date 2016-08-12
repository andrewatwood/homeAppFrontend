function size(){
    //Check wrapper width for button sizing
    var wrapper = $('.wrapper');
    if(wrapper.width()>384){
        console.log('Big screen - finding best fit');
        var optimal = 115;
        var max = 140;
        var min = 96;
        var total = wrapper.width();
        var exact = total/optimal;
        var roundUp = Math.ceil(exact);
        var roundDown = Math.floor(exact);
        var totalWidth;
        if(total/roundUp >= min){
            totalWidth = total/roundUp;
        } else {
            totalWidth = total/roundDown
        }
        var buttonWidth = totalWidth*(105/115);
        var marginWidth = totalWidth*(5/115);
        accessories.width(buttonWidth).css('margin',marginWidth).css('padding-bottom',buttonWidth);
        var square = buttonWidth;
        var gutter = marginWidth*2;
    } else {
        accessories.width('').css('margin','').css('padding-bottom','');
        var square = accessories.width();
        var gutter = accessories.outerWidth(true) - square;
    }
    //Set scene width
    console.log('Resizing - square: %s gutter: %s',square,gutter);
    var longWidth = square*2 + gutter;
    scenes.width(longWidth).css('margin',gutter/2);

    //Set scene wrapper width
    $('.scenes').each(function(){
        var columnCount = Math.ceil($(this).children('.action.scene').length/2)
        var factor = columnCount*longWidth ? columnCount*longWidth : 3;
        var totalWidth = factor + 40; //+ 36 + 2*($('#container').width()-325)/50;
        $(this).width(totalWidth);
    });
}

function bind(){
    $( window ).resize(function(){
        size();
    });

    //Vertical scroll - room title animation
    $('.scroll').scroll(function(){
        var bigTitle = $(this).siblings('.room-title');
        var littleTitle = $(this).siblings('.top-controls').children('.room-title-small');
        var current = $(this).scrollTop();
        var room = $(this).attr('room');
        if(current > scrollThreshold){
            if(!titleHidden[room]){
            titleHidden[room] = true;
            bigTitle.addClass('hidden');
            littleTitle.removeClass('hidden');
            $(this).addClass('border');
            }
        } else {
            if(titleHidden[room]){
            titleHidden[room] = false;
            bigTitle.removeClass('hidden');
            littleTitle.addClass('hidden');
            $(this).removeClass('border');
            }
        }
    });
    
    pressThreshold = 500;

    function startAccessoryTouch(e, deviceId){
        if(deviceId == undefined){
            var deviceId = $(this).attr('idx');
        }
        $(this).addClass('hover');
        touchStart = e.timeStamp;
        longPress = setTimeout(function(){
            console.log('long press blehheheh');
            app.showDeviceControl(deviceId);
        }.bind(this, deviceId), pressThreshold)
    }

    function endAccessoryTouch(e, deviceId){
        if(deviceId == undefined){
            var deviceId = $(this).attr('idx');
        }
        $(this).removeClass('hover');
        clearTimeout(longPress);
        if(e.timeStamp - touchStart < pressThreshold){
            console.log('click');
            app.toggleDevice(deviceId);
        }
    }

    $('.accessory').mousedown(startAccessoryTouch);
    $('.accessory').on("touchstart", function(e){
        e.preventDefault();
        var deviceId = e.currentTarget.getAttribute('idx');
        startAccessoryTouch(e, deviceId);
    }.bind(this));

    $('.accessory').mouseup(endAccessoryTouch);
    $('.accessory').on("touchend", function(e){
        e.preventDefault();
        var deviceId = e.currentTarget.getAttribute('idx');
        endAccessoryTouch(e, deviceId);
    }.bind(this));

    $('.switch').click(function(e){
        e.stopPropagation();
        console.log('switch click');
        //$(this).children('.toggle').toggleClass('off');
    })

    $('#big-control').click(function(){
        console.log('clicked black stuff');
        $(this).addClass('hidden');
    });
}

function init(){
    accessories = $('.action.accessory');
    scenes = $('.action.scene');
    scrolTimeout = false;

    scrollThreshold = 25
    titleHidden = {}

    size();
    bind();

    app.currentRoom = Object.keys(app.server.rooms).shift()
}
