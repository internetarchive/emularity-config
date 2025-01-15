$(document).ready(function() {
  function fakeScancode(scancode) {
    JSMAME.sdl_sendkeyboardkey(1, scancode);
    setTimeout(function() { JSMAME.sdl_sendkeyboardkey(0, scancode) }, 20);
  }
 
  $.extend($.keyboard.keyaction, {
    coin:    function(base) { fakeScancode(34); }, // SDL_SCANCODE_5
    p1:      function(base) { fakeScancode(30); }, // SDL_SCANCODE_1
    p2:      function(base) { fakeScancode(31); },  // SDL_SCANCODE_2
    advance: function(base) { fakeScancode(58); }, // SDL_SCANCODE_F1
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
      'default' : [
        '{coin}',
        '{p1}',
        '{p2}',
        '{advance}'
      ]
    },
    display: {
      'coin': 'INSERT COIN',
      'p1': 'PLAYER 1',
      'p2': 'PLAYER 2',
      'advance': 'ADVANCE'
    },
    position: {
      my: 'right top',
      at: 'left top',
      of: $('#canvas')
    }
  });
});
