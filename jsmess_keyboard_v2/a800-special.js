$(document).ready(function() {
  function fakeScancode(scancode) {
    JSMAME.sdl_sendkeyboardkey(1, scancode);
    setTimeout(function() { JSMAME.sdl_sendkeyboardkey(0, scancode) }, 20);
  }
 
	$.extend($.keyboard.keyaction, {
		option:  function(base) { fakeScancode(60); },   // SDL_SCANCODE_F3
		select:    function(base) { fakeScancode(59); }, // SDL_SCANCODE_F2
	  start:    function(base) { fakeScancode(58); }   // SDL_SCANCODE_F1
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
				'{option}',
				'{select}',
				'{start}'
			]
		},
		display: {
			'option': 'OPTION',
			'select': 'SELECT',
			'start': 'START'
		}
	});
});
