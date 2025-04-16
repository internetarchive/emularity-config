$(document).ready(function() {
  function fakeScancode(scancode) {
    JSMAME.sdl_sendkeyboardkey(1, scancode);
    setTimeout(function() { JSMAME.sdl_sendkeyboardkey(0, scancode) }, 20);
  }
 
  $.extend($.keyboard.keyaction, {
    coin:    function(base) { fakeScancode(34); }, // SDL_SCANCODE_5
    p1:      function(base) { fakeScancode(30); }, // SDL_SCANCODE_1
    p2:      function(base) { fakeScancode(31); },  // SDL_SCANCODE_2
    autoup:  function(base) { fakeScancode(58); }, // SDL_SCANCODE_F1
    advance: function(base) { fakeScancode(59); }, // SDL_SCANCODE_F2
    reset:   function(base) { fakeScancode(38); }  // SDL_SCANCODE_9
  });

  // Override default keyboard position options because passing them in at init doesn't seem to work
  $.extend($.keyboard.defaultOptions.position, {
    my: 'left top',
    at: 'left top',
    at2: 'left top',
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
        '{autoup}',
        '{advance}',
        '{reset}',
      ]
    },
    display: {
      'coin': 'INSERT COIN',
      'p1': 'PLAYER 1',
      'p2': 'PLAYER 2',
      'autoup': 'AUTO UP',
      'advance': 'ADVANCE',
      'reset': 'RESET'
    },
    position: {
      my: 'left top',
      at: 'left top',
      of: $('#begPgSpcr')
    }
  });
});
