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
        var totalWidth = 20 + columnCount*longWidth + 55;
        $(this).width(totalWidth);
    });
}

function bind(){
    $( window ).resize(function(){
        size();
    });
    $('.scroll').scroll(function(){
        var bigTitle = $(this).siblings('.room-title');
        var littleTitle = $(this).siblings('.top-controls').children('.room-title-small');
        var current = $(this).scrollTop();
        var room = $(this).attr('room');
        if(current > scrollThreshold){
            if(!titleHidden[room]){
            titleHidden[room] = true;
            bigTitle.toggleClass('hidden');
            littleTitle.toggleClass('hidden');
            $(this).toggleClass('border');
            }
        } else {
            if(titleHidden[room]){
            titleHidden[room] = false;
            bigTitle.toggleClass('hidden');
            littleTitle.toggleClass('hidden');
            $(this).toggleClass('border');
            }
    }
    });
}

function init(){
accessories = $('.action.accessory');
scenes = $('.action.scene');

scrollThreshold = 25
titleHidden = {}

size();
bind();
}
