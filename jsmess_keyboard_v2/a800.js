$(document).ready(function() {
        function fakeScancode(scancode) {
            JSMAME.sdl_sendkeyboardkey(1, scancode);
            setTimeout(function() { JSMAME.sdl_sendkeyboardkey(0, scancode) }, 20);
        }
 
        $.extend($.keyboard.keyaction, {
            option: function(base) { fakeScancode(34); }, // SDL_SCANCODE_5
            select: function(base) { fakeScancode(30); }, // SDL_SCANCODE_1
             start: function(base) { fakeScancode(81); }  // SDL_SCANCODE_DOWN
        });

        $('#keyboard').keyboard({ 
            layout : 'custom',
            restrictInput : false, // Prevent keys not in the displayed keyboard from being typed in 
            preventPaste : true,  // prevent ctrl-v and right click 
            autoAccept : true,
            usePreview : false,
            alwaysOpen : true,
            useCombos : false,
            customLayout: { 
 
        'default': [ 
            '{esc} 1 2 3 4 5 6 7 8 9 0 < > {bksp} {brk}',
            '{tab} q w e r t y u i o p - = {enter}', 
            '{ctrl} a s d f g h j k l ; + *', 
            '{s} z x c v b n m , . / {atari} {s}', 
            '{space}',
            '{option} {select} {start}'
        ], 

        'shift': [ 
            '{esc} ! " # $ % & H @ ( ) {clear} {insert} {delete} {break}', 
            '{set} Q W E R T Y U I O P _ | {enter}',
            '{ctrl} A S D F G H J K L : \ ^', 
            '{s} Z X C V B N M [ ] ? {atar} {s}', 
            '{space}',
            '{option} {select} {start}'
        ], 

        'meta1': [ 
            '1 2 3 4 5 6 7 8 9 0 {bksp}', 
            '- / : ; ( ) \u20ac & @ {enter}', 
            '{meta2} . , ? ! \' " {meta2}', 
            '{default} {space} {default} {accept}' 
        ], 
        'meta2': [ 
            '[ ] { } # % ^ * + = {bksp}', 
            '_ \\ | ~ < > $ \u00a3 \u00a5 {enter}', 
            '{meta1} . , ? ! \' " {meta1}', 
            '{default} {space} {default} {accept}' 
        ] 
 
    }, 
});
});
