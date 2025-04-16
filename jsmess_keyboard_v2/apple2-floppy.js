$(document).ready(function() {
  function fakeScancode(scancode) {
      JSMAME.sdl_sendkeyboardkey(1, scancode);
      setTimeout(function() { JSMAME.sdl_sendkeyboardkey(0, scancode) }, 20);
  }

  // Opens up a prompt to save fileData to the user's computer as filename.

	function saveFile(fileData, filename) {
		var data = new Blob([fileData], {'type':'application/octet-stream'}),
			a = document.createElement('a');
		a.href = window.URL.createObjectURL(data);
		a.download = filename;
		a.click();
	}

	$.extend($.keyboard.keyaction, {
		eject:   function(base) {
			// Save the cart in the machine.
			// ASSUMPTION: There's only one file in the root directory, and that is
			// the game.
			if (typeof FS === 'undefined') {
				alert('JSMESS has not started yet, so there is nothing to eject!');
				return;
			}
			var contents = FS.readdir('/'), i;
			for (i = 0; i < contents.length; i++) {
				if (contents[i].indexOf('.zip') === -1 && FS.isFile(FS.stat('/' + contents[i]).mode)) {
					// Download the file.
					saveFile(FS.readFile('/' + contents[i], { encoding: 'binary' }), contents[i]);
					break;
				}
			}
		}
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
				'{eject}'
			]
		},
		display: {
			'eject': 'EJECT (AND SAVE) FLOPPY'
		},
               position: {
                        my: 'left top',
                        at: 'left top',
                        of: $('#begPgSpcr')
                }

	});
});
