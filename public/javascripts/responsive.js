function size(){
    //Set scene width
    var square = accessories.width();
    var gutter = accessories.outerWidth(true) - square;
    console.log('Resizing - square: %s gutter: %s',square,gutter);
    var longWidth = square*2 + gutter;
    scenes.width(longWidth).css('margin-right',gutter/2,'margin-left',gutter/2);

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
