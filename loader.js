/**  The Emularity; easily embed emulators
  *  Copyright © 2014-2016 Daniel Brooks <db48x@db48x.net>, Jason
  *  Scott <jscott@archive.org>, Grant Galitz <grantgalitz@gmail.com>,
  *  John Vilk <jvilk@cs.umass.edu>, and Tracey Jaquith <tracey@archive.org>
  *
  *  This program is free software: you can redistribute it and/or modify
  *  it under the terms of the GNU General Public License as published by
  *  the Free Software Foundation, either version 3 of the License, or
  *  (at your option) any later version.
  *
  *  This program is distributed in the hope that it will be useful,
  *  but WITHOUT ANY WARRANTY; without even the implied warranty of
  *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  *  GNU General Public License for more details.
  *
  *  You should have received a copy of the GNU General Public License
  *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
  */

/* eslint-disable */
window.Module = null;

(function (Promise) {
   /**
    * IALoader
    */
   function IALoader(canvas, game, callbacks, scale) {
     // IA actually gives us an object here, and we really ought to be
     // looking things up from it instead.
     if (typeof game !== 'string') {
       game = game.toString();
     }
     if (!callbacks || typeof callbacks !== 'object') {
       callbacks = { before_emulator: updateLogo,
                     before_run: callbacks };
     } else {
       if (typeof callbacks.before_emulator === 'function') {
         var func = callbacks.before_emulator;
         callbacks.before_emulator = function () {
                                       updateLogo();
                                       func();
                                     };
       } else {
         callbacks.before_emulator = updateLogo;
       }
     }

     function img(src) {
       var img = new Image();
       img.src = src;
       return img;
     }

     // yea, this is a hack
     var images;
     if (/archive\.org$/.test(document.location.hostname) || /^archive.*\.onion$/.test(document.location.hostname)) {
       images = { ia: img("/images/ialogo.png"),
                  mame: img("/images/mame.png"),
                  mess: img("/images/mame.png"),
                  dosbox: img("/images/dosbox.png"),
                  sae: img("/images/sae.png"),
                  pce: img("/images/pce.png"),
                  vice: img("/images/vice.svg"),
                  np2: img("/images/nekop2.gif"),
                  xmil: img("/images/xmillenium_logo.jpg"),
                  vmac: img("/images/vmac.png"),
                  ruffle: img("/images/ruffle.png"),
                  cloudpilot: img("/images/cloudpilot.png"),
                  v86: img("/images/v86.png"),
                };
     } else {
       images = { ia: img("other_logos/ia-logo-150x150.png"),
                  mame: img("other_logos/mame.png"),
                  mess: img("other_logos/mame.png"),
                  dosbox: img("other_logos/dosbox.png"),
                  sae: img("other_logos/sae.png"),
                  pce: img("other_logos/pce.png"),
                  vice: img("other_logos/vice.svg"),
                  np2: img("other_logos/nekop2.gif"),
                  xmil: img("other_logos/xmillenium_logo.jpg"),
                  vmac: img("other_logos/vmac.png"),
                  ruffle: img("other_logos/ruffle.png"),
                  cloudpilot: img("other_logos/cloudpilot.png"),
                  v86: img("other_logos/v86.png"),
                };
     }

     function updateLogo() {
       if (emulator_logo) {
         emulator.setSplashImage(emulator_logo);
       }
     }

     var SAMPLE_RATE = (function () {
                          var audio_ctx = window.AudioContext || window.webkitAudioContext || false;
                          if (!audio_ctx) {
                            return false;
                          }
                          var sample = new audio_ctx;
                          return sample.sampleRate.toString();
                        }());

     var metadata, filelist, module, modulecfg, config_args, emulator_logo,
         emulator = new Emulator(canvas).setSplashImage(images.ia)
                                        .setLoad(loadFiles)
                                        .setCallbacks(callbacks);

     var cfgr;
     function loadFiles(fetch_file, splash) {
       splash.setTitle("Downloading game metadata...");
       return new Promise(function (resolve, reject) {
                            var loading = fetch_file('Game Metadata',
                                                     get_meta_url(game),
                                                     'document');
                            loading.then(function (data) {
                                           metadata = data;
                                           splash.setTitle("Downloading game filelist...");
                                           return fetch_file('Game File List',
                                                             get_files_url(game),
                                                             'document', true);
                                         },
                                         function () {
                                           splash.setTitle("Failed to download IA item metadata!");
                                           splash.failed_loading = true;
                                           reject(1);
                                         })
                                   .then(function (data) {
                                           if (splash.failed_loading) {
                                             return null;
                                           }
                                           filelist = data;
                                           splash.setTitle("Downloading emulator metadata...");
                                           module = metadata.getElementsByTagName("emulator")
                                                            .item(0)
                                                            .textContent;
                                           return fetch_file('Emulator Metadata',
                                                             get_emulator_config_url(module),
                                                             'text', true);
                                         },
                                         function () {
                                           if (splash.failed_loading) {
                                             return;
                                           }
                                           splash.setTitle("Failed to download file list!");
                                           splash.failed_loading = true;
                                           reject(2);
                                         })
                                   .then(function (data) {
                                           if (splash.failed_loading) {
                                             return null;
                                           }

                                           modulecfg = JSON.parse(data);
                                           var get_files;

                                           if (module && module.indexOf("dosbox") === 0) {
                                             emulator_logo = images.dosbox;
                                             cfgr = DosBoxLoader;
                                             get_files = get_dosbox_files;
                                           }
                                           else if (module && module.indexOf("sae-") === 0) {
                                             emulator_logo = images.sae;
                                             cfgr = SAELoader;
                                             get_files = get_sae_files;
                                           }
                                           else if (module && module.indexOf("pce-") === 0) {
                                             emulator_logo = images.pce;
                                             cfgr = PCELoader;
                                             get_files = get_pce_files;
                                           }
                                           else if (module && module.indexOf("vice") === 0) {
                                             emulator_logo = images.vice;
                                             cfgr = VICELoader;
                                             get_files = get_vice_files;
                                           }
                                           else if (module && module.indexOf("np2-") === 0) {
                                             emulator_logo = images.np2;
                                             cfgr = NP2Loader;
                                             get_files = get_np2_files;
                                           }
                                           else if (module && module.indexOf("ruffle-") === 0) {
                                             emulator_logo = images.ruffle;
                                             cfgr = RuffleLoader;
                                             get_files = get_ruffle_files;
                                           }
                                           else if (module && module.indexOf("xmil-") === 0) {
                                             emulator_logo = images.xmil;
                                             cfgr = NP2Loader;
                                             get_files = get_xmil_files;
                                           }
                                           else if (module && module.indexOf("vmac-") === 0) {
                                             emulator_logo = images.vmac;
                                             cfgr = NP2Loader;
                                             get_files = get_vmac_files;
                                           }
                                           else if (module && module.indexOf("cloudpilot-") === 0) {
                                             emulator_logo = images.cloudpilot;
                                             cfgr = CloudpilotLoader;
                                             get_files = get_cloudpilot_files;
                                           }
                                           else if (module && module.indexOf("v86") === 0) {
                                             emulator_logo = images.v86;
                                             cfgr = V86Loader;
                                             get_files = get_v86_files;
                                           }
                                           else if (module) {
                                             emulator_logo = images.mame;
                                             cfgr = MAMELoader;
                                             get_files = get_mame_files;
                                           }
                                           else {
                                             throw new Error("Unknown module type "+ module +"; cannot configure the emulator.");
                                           }

                                           var wantsWASM = modulecfg.wasm_filename && 'WebAssembly' in window;
                                           var nr = modulecfg['native_resolution'];
                                           config_args = [cfgr.emulatorJS(get_js_url(wantsWASM ? modulecfg.wasmjs_filename : modulecfg.js_filename)),
                                                          cfgr.emulatorWASM(wantsWASM && get_js_url(modulecfg.wasm_filename)),
                                                          cfgr.locateAdditionalEmulatorJS(locateAdditionalJS),
                                                          cfgr.fileSystemKey(game),
                                                          cfgr.nativeResolution(nr[0], nr[1]),
                                                          cfgr.aspectRatio(nr[0] / nr[1]),
                                                          cfgr.scale(scale || modulecfg.scale || 2),
                                                          cfgr.sampleRate(SAMPLE_RATE)];

                                           if ('keepAspect' in cfgr) {
                                             config_args.push(cfgr.keepAspect(modulecfg.keepAspect));
                                           }

                                           if (/archive\.org$/.test(document.location.hostname) || /^archive.*\.onion$/.test(document.location.hostname)) {
                                             config_args.push(cfgr.muted(document.cookie.indexOf('unmute=1') < 0)) // we're muted, unless cookie 'unmute' is set
                                           }

                                           var emulator_start_item = metadata.getElementsByTagName("emulator_start").item(0);
                                           if (module && module.indexOf("dosbox") === 0) {
                                             config_args.push(cfgr.startExe(metadata.getElementsByTagName("emulator_start")
                                                                                    .item(0)
                                                                                    .textContent));
                                           } else if (module && module.indexOf("vice") === 0) {
                                             var vice_fliplist = [ metadata.getElementsByTagName("vice_drive_8_fliplist").item(0),
                                                                   metadata.getElementsByTagName("vice_drive_9_fliplist").item(0),
                                                                   metadata.getElementsByTagName("vice_drive_10_fliplist").item(0),
                                                                   metadata.getElementsByTagName("vice_drive_11_fliplist").item(0) ];
                                             if (emulator_start_item) {
                                               config_args.push(cfgr.autoLoad(emulator_start_item.textContent));
                                             }
                                             var fliplists = [];
                                             vice_fliplist.forEach(function (fliplist_meta) {
                                                                     if(!fliplist_meta) {
                                                                       fliplists.push(null);
                                                                     } else {
                                                                       fliplists.push(fliplist_meta.textContent.split(";"));
                                                                     }
                                                                   });
                                             config_args.push(cfgr.fliplist(fliplists));
                                             config_args.push(cfgr.extraArgs(modulecfg.extra_args));
                                           } else if (module && module.indexOf("sae-") === 0) {
                                             config_args.push(cfgr.model(modulecfg.driver),
                                                              cfgr.rom(modulecfg.bios_filenames));
                                           } else if (module && (module.indexOf("np2-") == 0 ||
                                                                 module.indexOf("xmil-") == 0 ||
                                                                 module.indexOf("vmac-") == 0)) {
                                             if (!emulator_start_item) {
                                               throw new Exception("Error: this item does not have an 'emulator_start' metadata value; I don't know what to run.");
                                             }
                                             config_args.push(cfgr.autoLoad('/emulator/'+ emulator_start_item.textContent),
                                                              cfgr.extraArgs(modulecfg.extra_args));
                                           } else if (module && module.indexOf("pce-") === 0) {
                                             config_args.push(cfgr.model(modulecfg.driver),
                                                              cfgr.extraArgs(modulecfg.extra_args));
                                           } else if (module && module.indexOf("cloudpilot-") === 0) { // Cloudpilot
                                             config_args.push(cfgr.roms(modulecfg.bios_filenames));
                                           } else if (module && module.indexOf("ruffle-") === 0) {
                                             modulecfg.config = modulecfg.config || {};
                                             modulecfg.config.base = get_cors_url(game);
                                           } else if (module && module.indexOf("v86") === 0) {
                                             config_args.push(cfgr.memorySize(modulecfg.memory_size),
                                                              cfgr.vgaMemorySize(modulecfg.vga_memory_size),
                                                              cfgr.acpi(modulecfg.acpi),
                                                              cfgr.bootOrder(modulecfg.boot_order));
                                           } else if (module) { // MAME
                                             config_args.push(cfgr.driver(modulecfg.driver),
                                                              cfgr.extraArgs(modulecfg.extra_args));
                                             if (emulator_start_item) {
                                               config_args.push(cfgr.autoboot(emulator_start_item.textContent));
                                             }
                                           }

                                           splash.setTitle("Downloading game data...");
                                           return Promise.all(get_files(cfgr, metadata, modulecfg, filelist));
                                         },
                                         function () {
                                           if (splash.failed_loading) {
                                             return;
                                           }
                                           splash.setTitle("Failed to download emulator metadata!");
                                           splash.failed_loading = true;
                                           reject(2);
                                         })
                                   .then(function (game_files) {
                                           if (splash.failed_loading) {
                                             return;
                                           }
                                           updateLogo();
                                           resolve(cfgr.apply(null, extend(config_args, game_files)));
                                         },
                                         function (e) {
                                           if (splash.failed_loading) {
                                             return;
                                           }
                                           splash.setTitle("Failed to configure emulator!");
                                           splash.failed_loading = true;
                                           reject(3);
                                         });
                          });
     }

     function locateAdditionalJS(filename) {
       if ("file_locations" in modulecfg && filename in modulecfg.file_locations) {
         return get_js_url(modulecfg.file_locations[filename]);
       }
       return get_js_url(filename);
     }

     function get_dosbox_files(cfgr, metadata, modulecfg, filelist) {
       var default_drive = "c", // pick any drive letter as a default
           drives = {}, files = [],
           meta = dict_from_xml(metadata);
       if (game && game.endsWith(".zip")) {
         drives[default_drive] = game;
       }
       files_with_ext_from_filelist(filelist, meta.emulator_ext).forEach(function (file, i) {
                                                                           drives[default_drive] = file.name;
                                                                         });
       meta_props_matching(meta, /^dosbox_drive_([a-zA-Z])$/).forEach(function (result) {
                                                                        var key = result[0], match = result[1];
                                                                        drives[match[1]] = meta[key];
                                                                      });
       var mounts = Object.keys(drives),
           len = mounts.length;
       mounts.forEach(function (drive, i) {
                        var title = "Game File ("+ (i+1) +" of "+ len +")",
                            filename = drives[drive],
                            url = (filename.includes("/")) ? get_zip_url(filename)
                                                           : get_zip_url(filename, get_item_name(game));
                            if (filename.toLowerCase().endsWith(".zip")) {
                              files.push(cfgr.mountZip(drive,
                                                       cfgr.fetchFile(title, url)));
                            } else {
                              files.push(cfgr.mountFile('/'+ filename,
                                                        cfgr.fetchFile(title, url)));
                            }
                      });
       return files;
     }

     function get_vice_files(cfgr, metadata, modulecfg, filelist) {
       var default_drive = "8",
           drives = {}, files = [], wanted_files = [],
           meta = dict_from_xml(metadata);
       files_with_ext_from_filelist(filelist, meta.emulator_ext).forEach(function (file, i) {
                                                                           wanted_files.push(file.name);
                                                                         });
       files_with_ext_from_filelist(filelist, "conf").forEach(function (file, i) {
                                                                           wanted_files.push(file.name);
                                                                         });
       meta_props_matching(meta, /^vice_drive_([89])$/).forEach(function (result) {
                                                                  var key = result[0], match = result[1];
                                                                  drives[match[1]] = meta[key];
                                                                });

       var len = wanted_files.length;
       wanted_files.forEach(function (file, i) {
                              var title = "Game File ("+ (i+1) +" of "+ len +")",
                                  filename = file,
                                  url = (filename.includes("/")) ? get_zip_url(filename)
                                                                 : get_zip_url(filename, get_item_name(game));
                              if (filename.toLowerCase().endsWith(".zip") && false) { // TODO: Enable and fix zip support.
                                files.push(cfgr.mountZip("", // TODO: This is a hack, no drive actually applicable here
                                                         cfgr.fetchFile(title, url)));
                              } else {
                                //TODO: ensure vice_drive_8 and vice_drive_9 actually function.
                                files.push(cfgr.mountFile('/'+ filename,
                                                          cfgr.fetchFile(title, url)));
                              }
                            });
       return files;
     }

     function get_mame_files(cfgr, metadata, modulecfg, filelist) {
       var files = [],
           bios_files = modulecfg['bios_filenames'];
       bios_files.forEach(function (fname, i) {
                            if (fname) {
                              var title = "Bios File ("+ (i+1) +" of "+ bios_files.length +")";
                              files.push(cfgr.mountFile('/'+ fname,
                                                        cfgr.fetchFile(title,
                                                                       get_bios_url(fname))));
                            }
                          });

       var meta = dict_from_xml(metadata),
           peripherals = {},
           game_files_counter = {};
       files_with_ext_from_filelist(filelist, meta.emulator_ext).forEach(function (file, i) {
                                                                           game_files_counter[file.name] = 1;
                                                                           if (modulecfg.peripherals && modulecfg.peripherals[i]) {
                                                                             peripherals[modulecfg.peripherals[i]] = file.name;
                                                                           }
                                                                         });
       meta_props_matching(meta, /^mame_peripheral_([a-zA-Z0-9]+)$/).forEach(function (result) {
                                                                               var key = result[0], match = result[1];
                                                                               peripherals[match[1]] = meta[key];
                                                                               game_files_counter[meta[key]] = 1;
                                                                             });

       var game_files = Object.keys(game_files_counter),
           len = game_files.length;
       game_files.forEach(function (filename, i) {
                            var title = "Game File ("+ (i+1) +" of "+ len +")",
                                url = (filename.includes("/")) ? get_zip_url(filename)
                                                               : get_zip_url(filename, get_item_name(game));
                            files.push(cfgr.mountFile('/'+ filename,
                                                      cfgr.fetchFile(title, url)));
                          });

       // add on game drive (.chd) files, if any
       // chd files must go into a subdir named after the driver for mame to find them
       var drive_files = files_with_ext_from_filelist(filelist, 'chd');  // maybe 'chd' should be meta.drive_ext?
       len = drive_files.length;
       drive_files.forEach(function (file, i) {
                             var title = "Game Drive ("+ (i+1) +" of "+ len +")";
                             var url = (file.name.includes("/")) ? get_zip_url(file.name)
                                                                 : get_zip_url(file.name, get_item_name(game));
                             files.push(cfgr.mountFile(modulecfg.driver + '/' + file.name,
                                                       cfgr.fetchFile(title, url)));
                           });

       Object.keys(peripherals).forEach(function (periph) {
                                          files.push(cfgr.peripheral(periph,                // we're not pushing a 'file' here,
                                                                     peripherals[periph])); // but that's ok
                                        });

       files.push(cfgr.mountFile('/'+ modulecfg['driver'] + '.cfg',
                                 cfgr.fetchOptionalFile("CFG File",
                                                        get_other_emulator_config_url(module))));
       return files;
     }

     function get_sae_files(cfgr, metadata, modulecfg, filelist) {
       var files = [],
           bios_files = modulecfg['bios_filenames'];
       bios_files.forEach(function (fname, i) {
                            if (fname) {
                              var title = "Bios File ("+ (i+1) +" of "+ bios_files.length +")";
                              files.push(cfgr.mountFile('/'+ fname,
                                                        cfgr.fetchFile(title,
                                                                       get_bios_url(fname))));
                            }
                          });

       var meta = dict_from_xml(metadata),
           game_files = files_with_ext_from_filelist(filelist, meta.emulator_ext);
       game_files.forEach(function (file, i) {
                            if (file) {
                              var title = "Game File ("+ (i+1) +" of "+ game_files.length +")",
                                  url = (file.name.includes("/")) ? get_zip_url(file.name)
                                                                  : get_zip_url(file.name, get_item_name(game));
                              files.push(cfgr.mountFile('/'+ file.name,
                                                        cfgr.fetchFile(title, url)));
                              files.push(cfgr.floppy(0,             // we're not pushing a file here
                                                     file.name));   // but that's ok
                            }
                          });
       files.push(cfgr.mountFile('/'+ modulecfg['driver'] + '.cfg',
                                 cfgr.fetchOptionalFile("Config File",
                                                        get_other_emulator_config_url(module))));
       return files;
     }

     function get_ruffle_files(cfgr, metadata, modulecfg, filelist) {
       window.RufflePlayer = window.RufflePlayer || {};
       window.RufflePlayer.config = modulecfg.config;
       var files = [];
       var meta = dict_from_xml(metadata);
       var game_files = files_with_ext_from_filelist(filelist, meta.emulator_ext);

       if (game_files.length > 0) {
         var file = game_files[0]; // only allow one .swf file to be loaded
         var title = 'Downloading Game File';
         var url = (file.name.includes('/')) ? get_zip_url(file.name)
                                             : get_zip_url(file.name, get_item_name(game));
         files.push(cfgr.mountFile('/' + file.name, cfgr.fetchFile(title, url)));
         files.push(cfgr.swf_file_name('/' + file.name));
       }
       return files;
    }

     function get_pce_files(cfgr, metadata, modulecfg, filelist) {
       var files = [],
           bios_files = modulecfg['bios_filenames'];
       bios_files.forEach(function (fname, i) {
                            if (fname) {
                              var title = "ROM File ("+ (i+1) +" of "+ bios_files.length +")";
                              files.push(cfgr.mountFile('/'+ fname,
                                                        cfgr.fetchFile(title,
                                                                       get_bios_url(fname))));
                            }
                          });

       var meta = dict_from_xml(metadata),
           game_files_counter = {};
       files_with_ext_from_filelist(filelist, meta.emulator_ext).forEach(function (file, i) {
                                                                           if (modulecfg.peripherals && modulecfg.peripherals[i]) {
                                                                             game_files_counter[file.name] = modulecfg.peripherals[i];
                                                                           }
                                                                         });
       meta_props_matching(meta, /^pce_drive_([a-zA-Z0-9]+)$/).forEach(function (result) {
                                                                         var key = result[0], periph = result[1][1];
                                                                         game_files_counter[meta[key]] = periph;
                                                                       });

       var game_files = Object.keys(game_files_counter),
           len = game_files.length;
       game_files.forEach(function (filename, i) {
                            var title = "Game File ("+ (i+1) +" of "+ len +")",
                                ext = filename.match(/\.([^.]*)$/)[1],
                                url = (filename.includes("/")) ? get_zip_url(filename)
                                                               : get_zip_url(filename, get_item_name(game));
                            files.push(cfgr.mountFile('/'+ game_files_counter[filename] +'.'+ ext,
                                                      cfgr.fetchFile(title, url)));
                          });

       files.push(cfgr.mountFile('/pce-'+ modulecfg['driver'] + '.cfg',
                                 cfgr.fetchOptionalFile("Config File",
                                                        get_other_emulator_config_url("pce-"+ modulecfg['driver']))));
       return files;
     }

     // TODO(db48x): get_{np2,xmil,vmac}_files are even more
     // duplicative than the rest; time to factor this a lot
     function get_np2_files(cfgr, metadata, modulecfg, filelist) {
       var files = [],
           bios_files = modulecfg['bios_filenames'];
       bios_files.forEach(function (fname, i) {
                            if (fname) {
                              var title = "ROM File ("+ (i+1) +" of "+ bios_files.length +")",
                                  mounter = (fname.endsWith(".zip")) ? cfgr.mountZip
                                                                     : cfgr.mountFile;
                              files.push(mounter('np2',
                                                 cfgr.fetchFile(title, get_bios_url(fname))));
                            }
                          });
       var meta = dict_from_xml(metadata),
           peripherals = {},
           game_files_counter = {};
       files_with_ext_from_filelist(filelist, meta.emulator_ext).forEach(function (file, i) {
                                                                           game_files_counter[file.name] = 1;
                                                                         });

       var game_files = Object.keys(game_files_counter),
           len = game_files.length;
       game_files.forEach(function (filename, i) {
                            var title = "Game File ("+ (i+1) +" of "+ len +")",
                                url = (filename.includes("/")) ? get_zip_url(filename)
                                                               : get_zip_url(filename, get_item_name(game));
                            files.push(cfgr.mountFile('/'+ filename,
                                                      cfgr.fetchFile(title, url)));
                          });
       return files;
     }

     function get_xmil_files(cfgr, metadata, modulecfg, filelist) {
       var files = [],
           bios_files = modulecfg['bios_filenames'];
       bios_files.forEach(function (fname, i) {
                            if (fname) {
                              var title = "ROM File ("+ (i+1) +" of "+ bios_files.length +")",
                                  mounter = (fname.endsWith(".zip")) ? cfgr.mountZip
                                                                     : cfgr.mountFile;
                              files.push(mounter('xmil',
                                                 cfgr.fetchFile(title, get_bios_url(fname))));
                            }
                          });
       var meta = dict_from_xml(metadata),
           peripherals = {},
           game_files_counter = {};
       files_with_ext_from_filelist(filelist, meta.emulator_ext).forEach(function (file, i) {
                                                                           game_files_counter[file.name] = 1;
                                                                         });

       var game_files = Object.keys(game_files_counter),
           len = game_files.length;
       game_files.forEach(function (filename, i) {
                            var title = "Game File ("+ (i+1) +" of "+ len +")",
                                url = (filename.includes("/")) ? get_zip_url(filename)
                                                               : get_zip_url(filename, get_item_name(game));
                            files.push(cfgr.mountFile('/'+ filename,
                                                      cfgr.fetchFile(title, url)));
                          });
       return files;
     }

     function get_vmac_files(cfgr, metadata, modulecfg, filelist) {
       var files = [],
           bios_files = modulecfg['bios_filenames'];
       bios_files.forEach(function (fname, i) {
                            if (fname) {
                              var title = "ROM File ("+ (i+1) +" of "+ bios_files.length +")",
                                  mounter = (fname.endsWith(".zip")) ? cfgr.mountZip
                                                                     : cfgr.mountFile;
                              files.push(mounter('minivmac',
                                                 cfgr.fetchFile(title, get_bios_url(fname))));
                            }
                          });
       var meta = dict_from_xml(metadata),
           peripherals = {},
           game_files_counter = {};
       files_with_ext_from_filelist(filelist, meta.emulator_ext).forEach(function (file, i) {
                                                                           game_files_counter[file.name] = 1;
                                                                         });

       var game_files = Object.keys(game_files_counter),
           len = game_files.length;
       game_files.forEach(function (filename, i) {
                            var title = "Game File ("+ (i+1) +" of "+ len +")",
                                url = (filename.includes("/")) ? get_zip_url(filename)
                                                               : get_zip_url(filename, get_item_name(game));
                            files.push(cfgr.mountFile('/'+ filename,
                                                      cfgr.fetchFile(title, url)));
                          });
       return files;
     }

     function get_cloudpilot_files(cfgr, metadata, modulecfg, filelist) {
       var files = [];
       var bios_files = modulecfg['bios_filenames'];
       bios_files.forEach(function (fname, i) {
                            if (fname) {
                              var title = "Bios File ("+ (i+1) +" of "+ bios_files.length +")";
                              files.push(cfgr.mountFile('/'+ fname,
                                                        cfgr.fetchFile(title,
                                                                       get_bios_url(fname))));
                            }
                          });
       var meta = dict_from_xml(metadata);
       var game_files = files_with_ext_from_filelist(filelist, meta.emulator_ext);
       var len = game_files.length;
       if (game_files.length > 0) {
         var file = game_files[0]; // only allow one .swf file to be loaded
         var title = 'Downloading Game File';
         var url = (file.name.includes('/')) ? get_zip_url(file.name)
                                             : get_zip_url(file.name, get_item_name(game));
         files.push(cfgr.mountFile('/' + file.name, cfgr.fetchFile(title, url)));
         files.push(cfgr.prc(file.name));
       }
       return files;
    }

     function get_v86_files(cfgr, metadata, modulecfg, filelist) {
       var files = [];

       if (modulecfg['bios_filename']) {
         files.push(cfgr.mountFile('/' + modulecfg['bios_filename'], cfgr.fetchFile("BIOS File", get_bios_url(modulecfg['bios_filename']))));
         files.push(cfgr.bios(modulecfg['bios_filename']));
       }
       if (modulecfg['vga_bios_filename']) {
         files.push(cfgr.mountFile('/' + modulecfg['vga_bios_filename'], cfgr.fetchFile("VGA BIOS File", get_bios_url(modulecfg['vga_bios_filename']))));
         files.push(cfgr.vgaBios(modulecfg['vga_bios_filename']));
       }

       var meta = dict_from_xml(metadata),
           game_files_counter = {};
       files_with_ext_from_filelist(filelist, meta.emulator_ext).forEach(function (file, i) {
                                                                           if (modulecfg.peripherals && modulecfg.peripherals[i]) {
                                                                             game_files_counter[file.name] = modulecfg.peripherals[i];
                                                                           }
                                                                         });
       meta_props_matching(meta, /^v86_drive_([a-zA-Z0-9]+)$/).forEach(function (result) {
                                                                         var key = result[0], periph = result[1][1];
                                                                         game_files_counter[meta[key]] = periph;
                                                                       });

       var game_files = Object.keys(game_files_counter),
           len = game_files.length;
       game_files.forEach(function (filename, i) {
                            var title = "Game File ("+ (i+1) +" of "+ len +")",
                                ext = filename.match(/\.([^.]*)$/)[1],
                                url = (filename.includes("/")) ? get_zip_url(filename)
                                                               : get_zip_url(filename, get_item_name(game)),
                                periph = game_files_counter[filename],
                                path = '/' + periph + '.' + ext,
                                periph_cfg = {};
                            periph_cfg[periph] = {"path": path};
                            files.push(cfgr.mountFile(path,
                                                      cfgr.fetchFile(title, url)));
                            files.push(periph_cfg);
                          });

      return files;
     }

     var get_item_name = function (game_path) {
       return game_path.split('/').shift();
     };

     var get_game_name = function (game_path) {
       return game_path.split('/').pop();
     };

     // NOTE: deliberately use cors.archive.org since this will 302 rewrite to iaXXXXX.us.archive.org/XX/items/...
     // and need to keep that "artificial" extra domain-ish name to avoid CORS issues with IE/Safari  (tracey@archive)
     var get_cors_url = function(item, path) {
       if (item === 'emularity-engine' || item === 'emularity-config' || item === 'emularity-bios') {
        // If http origin is null (the string 'null'!), assume onion.
        // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin#null
         if (location.origin === 'null' || (typeof location.origin === 'string' && location.origin.endsWith('.onion'))) {
          // this is just for archive.org onion urls
          return '//archive.org/services/' + item.replace('-', '/') + (path ? '/' + path : '');
        } else {
          // allow optional testing CGI arg to hit the review app test cluster
          // (helpful for testing out pre-production code & files)
          var prefix = location.search.indexOf('?devao=1') < 0 ? '' : 'internetarchive-';
          var domain = location.search.indexOf('?devao=1') < 0 ? 'ux-b.archive.org' : 'dev.archive.org';
          return '//' + prefix + item + '.' + domain + (path ? '/' + path : '');
         }
       }

       return '//cors.archive.org/cors/' + item + (path ? '/' + path : '');
     }

     var get_emulator_config_url = function (module) {
       return get_cors_url('emularity-engine', module + '.json');
     };

     var get_other_emulator_config_url = function (module) {
       return get_cors_url('emularity-config', module + '.cfg');
     };

     var get_meta_url = function (game_path) {
       var path = game_path.split('/');
       return get_cors_url(path[0], path[0] + "_meta.xml");
     };

     var get_files_url = function (game_path) {
       var path = game_path.split('/');
       return get_cors_url(path[0], path[0] +"_files.xml");
     };

     var get_zip_url = function (game_path, item_path) {
       if (item_path) {
         return get_cors_url(item_path, game_path);
       }
       return get_cors_url(game_path);
     };

     var get_js_url = function (js_filename) {
       return get_cors_url('emularity-engine', js_filename);
     };

     var get_bios_url = function (bios_filename) {
       return get_cors_url('emularity-bios', bios_filename);
     };

     function mountat (drive) {
       return function (data) {
         return { drive: drive,
                  mountpoint: "/" + drive,
                  data: data
                };
       };
     }

     return emulator;
   }

   /**
    * BaseLoader
    */
   function BaseLoader() {
     return Array.prototype.reduce.call(arguments, extend);
   }

   BaseLoader.canvas = function (id) {
     var elem = id instanceof Element ? id : document.getElementById(id);
     return { canvas: elem };
   };

   BaseLoader.emulatorJS = function (url) {
     return { emulatorJS: url };
   };

   BaseLoader.emulatorWASM = function (url) {
     return { emulatorWASM: url };
   };

   BaseLoader.locateAdditionalEmulatorJS = function (func) {
     return { locateAdditionalJS: func };
   };

   BaseLoader.fileSystemKey = function (key) {
     return { fileSystemKey: key };
   };

   BaseLoader.nativeResolution = function (width, height) {
     if (typeof width !== 'number' || typeof height !== 'number')
       throw new Error("Width and height must be numbers");
     return { nativeResolution: { width: Math.floor(width), height: Math.floor(height) } };
   };

   BaseLoader.aspectRatio = function (ratio) {
     if (typeof ratio !== 'number')
       throw new Error("Aspect ratio must be a number");
     return { aspectRatio: ratio };
   };

   BaseLoader.scale = function (scale) {
     return { scale: scale };
   };

   BaseLoader.sampleRate = function (rate) {
     return { sample_rate: rate };
   };

   BaseLoader.muted = function (muted) {
     return { muted: muted };
   };

   BaseLoader.mountZip = function (drive, file) {
     return { files: [{ drive: drive,
                        mountpoint: "/" + drive,
                        file: file
                      }] };
   };

   BaseLoader.mountFile = function (filename, file) {
     return { files: [{ mountpoint: filename,
                        file: file
                      }] };
   };

   BaseLoader.fetchFile = function (title, url) {
     return { title: title, url: url, optional: false };
   };

   BaseLoader.fetchOptionalFile = function (title, url) {
     return { title: title, url: url, optional: true };
   };

   BaseLoader.localFile = function (title, data) {
     return { title: title, data: data };
   };

   /**
    * DosBoxLoader
    */
   function DosBoxLoader() {
     var config = Array.prototype.reduce.call(arguments, extend);
     config.emulator_arguments = build_dosbox_arguments(config.emulatorStart, config.files, config.extra_dosbox_args);
     config.runner = EmscriptenRunner;
     return config;
   }
   DosBoxLoader.__proto__ = BaseLoader;

   DosBoxLoader.startExe = function (path) {
     return { emulatorStart: path };
   };

   DosBoxLoader.extraArgs = function (args) {
     return { extra_dosbox_args: args };
   };

   DosBoxLoader.mountZip = function (drive, file, drive_type) {
     //  driver type: hdd, floppy, cdrom
     return { files: [{ drive: drive,
                        mountpoint: "/" + drive,
                        file: file,
                        drive_type: drive_type || "hdd",
                      }] };
   };

   /**
    * PC98DosBoxLoader
    */
   function PC98DosBoxLoader() {
    var config = Array.prototype.reduce.call(arguments, extend);
    config.emulator_arguments = build_dosbox_arguments(config.emulatorStart, config.files, config.extra_dosbox_args);
    config.runner = PC98DosBoxRunner;
    return config;
  }
  PC98DosBoxLoader.__proto__ = DosBoxLoader;

   /**
    * MAMELoader
    */
   function MAMELoader() {
     var config = Array.prototype.reduce.call(arguments, extend);
     config.emulator_arguments = build_mame_arguments(config.muted, config.mame_driver,
                                                      config.nativeResolution, config.sample_rate,
                                                      config.peripheral, config.autoboot,
                                                      config.extra_mame_args, config.keep_aspect,
                                                      config.scale);
     config.runner = MAMERunner;
     return config;
   }
   MAMELoader.__proto__ = BaseLoader;

   MAMELoader.driver = function (driver) {
     return { mame_driver: driver };
   };

   MAMELoader.peripheral = function (peripheral, game) {
     var p = {};
     p[peripheral] = [game];
     return { peripheral: p };
   };

   MAMELoader.keepAspect = function (keep) {
     return { keep_aspect: !!keep };
   };

   MAMELoader.extraArgs = function (args) {
     return { extra_mame_args: args };
   };

   MAMELoader.autoboot = function (path) {
    return { autoboot: path };
   };

   /**
    * VICELoader
    */
    function VICELoader() {
      var config = Array.prototype.reduce.call(arguments, extend);
      if (config.fliplist) {
          VICELoader._create_fliplist_file(config.files, config.fliplist);
      }
      config.emulator_arguments = build_vice_arguments(config.emulatorStart, config.files, config.fliplist, config.extra_vice_args);
      config.runner = EmscriptenRunner;
      return config;
    }
    VICELoader.__proto__ = BaseLoader;

    VICELoader.autoLoad = function (path) {
     return { emulatorStart: path };
    };
    VICELoader.extraArgs = function (args) {
      return { extra_vice_args: args };
    };
    VICELoader.fliplist = function(fliplist) {
        return { fliplist: fliplist };
    };
    VICELoader._create_fliplist_file = function(files, fliplists) {
       var fliplist = "# Vice fliplist file\n\n";
       fliplists.forEach(function(drive_fliplist, i) {
           if(drive_fliplist) {
               drive_fliplist = drive_fliplist.reverse();
               fliplist += "UNIT " + (i + 8).toString() + "\n";
               drive_fliplist.forEach(function(disk_image) {
                   fliplist += "/emulator/" + disk_image + "\n";
               });
           }
       });
       files.push(VICELoader.mountFile('/metadata_fliplist.vfl', VICELoader.localFile("Fliplist", fliplist)).files[0]);
    };

   /**
    * SAELoader
    */

   function SAELoader() {
     var config = Array.prototype.reduce.call(arguments, extend);
     config.runner = SAERunner;
     return config;
   }
   SAELoader.__proto__ = BaseLoader;

   SAELoader.model = function (model) {
     return { amigaModel: model };
   };

   SAELoader.fastMemory = function (megabytes) {
     return { fast_memory: megabytes << 20 };
   };

   SAELoader.rom = function (filenames) {
     if (typeof filenames == "string")
       filenames = [filenames];
     return { rom: filenames[0], extRom: filenames[1] };
   };

   SAELoader.floppy = function (index, filename) {
     var f = {};
     f[index] = filename;
     return { floppy: f };
   };

   SAELoader.ntsc = function (v) {
     return { ntsc: !!v };
   };

   /**
    * PCELoader
    */

   function PCELoader() {
     var config = Array.prototype.reduce.call(arguments, extend);
     config.emulator_arguments = ["-c", "/emulator/pce-"+ config.pceModel +".cfg"];
     if (config.extra_pce_args && config.extra_pce_args.length > 0) {
       config.emulator_arguments = config.emulator_arguments.concat(config.extra_pce_args);
     }
     config.runner = EmscriptenRunner;
     return config;
   }
   PCELoader.__proto__ = BaseLoader;

   PCELoader.model = function (model) {
     return { pceModel: model };
   };

   PCELoader.extraArgs = function (args) {
     return { extra_pce_args: args };
   };

   /**
    * RuffleLoader
    */
   function RuffleLoader () {
     var config = Array.prototype.reduce.call(arguments, extend);
     config.runner = RuffleRunner;
     return config;
   }

   RuffleLoader.__proto__ = BaseLoader;

   RuffleLoader.swf_file_name = function (file_name) {
     return { swf_file_name: file_name };
   };

   /**
    * NP2Loader
    *
    * TODO(db48x): This is currently doing triple-duty as the loader
    * for the xmil and vmac emulators as well. Investigate to see if it
    * would be better to split them out. Since all three are by the
    * same author, it may simply be better to rename it instead.
    */
   function NP2Loader() {
     var config = Array.prototype.reduce.call(arguments, extend);
     if (!config.emulatorStart) {
       throw new Error("You must specify an autoLoad value in order to start this emulator. Try the name of the disk image.");
     }
     config.emulator_arguments = build_np2_arguments(config.emulatorStart, config.files, config.extra_np2_args);
     config.runner = NP2Runner;
     return config;
   }
   NP2Loader.__proto__ = BaseLoader;

   NP2Loader.autoLoad = function (path) {
     return { emulatorStart: path };
   };
   NP2Loader.extraArgs = function (args) {
     return { extra_np2_args: args };
   };

   function CloudpilotLoader() {
     var config = Array.prototype.reduce.call(arguments, extend);
     config.runner = CloudpilotRunner;
     return config;
   }
   CloudpilotLoader.roms = function (filenames) {
     if (typeof filenames == "string") {
       filenames = [filenames];
     }
     var roms = {};
     // Assume one .bin file (Palm BIOS ROM), and one .img file (freshly booted session image).
     roms.bios = filenames.find((f) => f.match(/\.bin$/i));
     roms.session = filenames.find((f) => f.match(/\.img$/i));
     return roms;
   };
   CloudpilotLoader.prc = function (filename) {
     return { prc: filename };
   };
   CloudpilotLoader.__proto__ = BaseLoader;

   /**
    * V86Loader
    */
   function V86Loader() {
     var config = Array.prototype.reduce.call(arguments, extend);
     config.memory_size = config.memory_size || 32;
     config.vga_memory_size = config.vga_memory_size || 2;
     config.boot_order = config.boot_order || 0x213;
     config.runner = V86Runner;
     return config;
   }
   V86Loader.__proto__ = BaseLoader;

   V86Loader.bios = function (filename) {
     return {"bios": {"path": filename}};
   };

   V86Loader.vgaBios = function (filename) {
     return {"vga_bios": {"path": filename}};
   };

   V86Loader.fda = function (filename) {
     return {"fda": {"path": filename}};
   };

   V86Loader.fdb = function (filename) {
     return {"fdb": {"path": filename}};
   };

   V86Loader.hda = function (filename) {
     return {"hda": {"path": filename}};
   };

   V86Loader.hdb = function (filename) {
     return {"hda": {"path": filename}};
   };

   V86Loader.cdrom = function (filename) {
     return {"cdrom": {"path": filename}};
   };

   V86Loader.bootOrder = function (order) {
     return {"boot_order": order};
   };

   V86Loader.acpi = function (enabled) {
     return {"acpi": !!enabled};
   };

   V86Loader.memorySize = function (amount) {
     return {"memory_size": amount};
   };

   V86Loader.vgaMemorySize = function (amount) {
     return {"vga_memory_size": amount};
   };

   var build_mame_arguments = function (muted, driver, native_resolution, sample_rate, peripheral, autoboot, extra_args, keepaspect, scale) {
     scale = scale || 1;
     var args = [driver,
                 '-verbose',
                 '-rompath', 'emulator',
                 '-window',
                 keepaspect ? '-keepaspect' : '-nokeepaspect'];

     if (native_resolution && "width" in native_resolution && "height" in native_resolution) {
       args.push('-resolution', [native_resolution.width * scale, native_resolution.height * scale].join('x'));
     }

     if (sample_rate) {
       args.push('-samplerate', sample_rate);
     }

     if (autoboot) {
       args.push('-autoboot_command', autoboot+'\\n', '-autoboot_delay', '2');
     }

     if (extra_args) {
       args = args.concat(extra_args);
     }

     if (peripheral) {
       for (var p in peripheral) {
         if (Object.prototype.propertyIsEnumerable.call(peripheral, p)) {
           args.push('-' + p,
                     '/emulator/'+ (peripheral[p][0].replace(/\//g,'_')));
         }
       }
     }

     return args;
   };

   var build_dosbox_arguments = function (emulator_start, files, extra_args) {
     var args = ['-conf', '/emulator/dosbox.conf'];

     var len = files.length;
     for (var i = 0; i < len; i++) {
       if ('drive' in files[i]) {
        //  See also https://www.dosbox.com/wiki/MOUNT
         if(files[i].drive_type==='hdd'){
          args.push('-c', 'mount '+ files[i].drive +' /emulator'+ files[i].mountpoint);
         }
         else if(files[i].drive_type==='floppy'){
          args.push('-c', 'mount '+ files[i].drive +' /emulator'+ files[i].mountpoint + ' -t floppy');
         }
         else if(files[i].drive_type==='cdrom'){
          args.push('-c', 'mount '+ files[i].drive +' /emulator'+ files[i].mountpoint + ' -t cdrom');
         }
       }
     }

     if (extra_args) {
       args = args.concat(extra_args);
     }

     var path = emulator_start.split(/\\|\//); // I have LTS already
     args.push('-c', /^[a-zA-Z]:$/.test(path[0]) ? path.shift() : 'c:');
     var prog = path.pop();
     if (path && path.length)
       args.push('-c', 'cd '+ path.join('/'));
     args.push('-c', prog);

     return args;
   };

   var build_vice_arguments = function (emulator_start, files, fliplist, extra_args) {
     var args = emulator_start ? ["-autostart", "/emulator/" + emulator_start] : [];
     if (fliplist[0] || fliplist[1] || fliplist[2] || fliplist[3]) {
       args = args.concat(["-flipname", "/emulator/metadata_fliplist.vfl"]);
     }
     if (extra_args) {
       args = args.concat(extra_args);
     }
     return args;
   };

   var build_np2_arguments = function (emulator_start, files, extra_args) {
     var args = emulator_start ? [emulator_start] : [];
     if (extra_args) {
       args = args.concat(extra_args);
     }
     return args;
   };

   /*
    * EmscriptenRunner
    */
   function EmscriptenRunner(canvas, game_data) {
     var self = this;
     this._canvas = canvas;
     this._hooks = { start: [], reset: [] };
     // This is somewhat wrong, because our Emscripten-based emulators
     // are currently compiled to start immediately when their js file
     // is loaded.
     Module = { arguments: game_data.emulator_arguments,
                screenIsReadOnly: true,
                print: function (text) { console.log(text); },
                printErr: function (text) { console.log(text); },
                canvas: canvas,
                noInitialRun: false,
                locateFile: game_data.locateAdditionalJS,
                wasmBinary: game_data.wasmBinary,
                preInit: function () {
                           // Re-initialize BFS to just use the writable in-memory storage.
                           BrowserFS.initialize(game_data.fs);
                           var BFS = new BrowserFS.EmscriptenFS();
                           // Mount the file system into Emscripten.
                           FS.mkdir('/emulator');
                           FS.mount(BFS, {root: '/'}, '/emulator');
                         },
                preRun: [function () {
                            self._hooks.start.forEach(function (f) {
                                                        //try {
                                                          f && f();
                                                        //} catch(x) {
                                                        //  console.warn(x);
                                                        //}
                                                      });
                          }]
              };
   }

   EmscriptenRunner.prototype.start = function () {
   };

   EmscriptenRunner.prototype.pause = function () {
   };

   EmscriptenRunner.prototype.stop = function () {
   };

  var mute_protection = function() {
    var func = Module._SDL_PauseAudio;
    if (!func) {
      try {
        func = eval('_SDL_PauseAudio');
      } catch (e) {}
    }
    if (!func)
      throw Error('EmscriptenRunner cant un/mute'); // avoid abort()
  };

   EmscriptenRunner.prototype.mute = function () {
     try {
       mute_protection();
       if (!window.SDL_PauseAudio)
         window.SDL_PauseAudio = Module.cwrap('SDL_PauseAudio', '', ['number']);
       window.SDL_PauseAudio(true);
     } catch (x) {
       console.log("Unable to change audio state:", x);
     }
   };

   EmscriptenRunner.prototype.unmute = function () {
     try {
       mute_protection();
       if (!window.SDL_PauseAudio)
         window.SDL_PauseAudio = Module.cwrap('SDL_PauseAudio', '', ['number']);
       window.SDL_PauseAudio(false);
     } catch (x) {
       console.log("Unable to change audio state:", x);
     }
   };

   EmscriptenRunner.prototype.onStarted = function (func) {
     this._hooks.start.push(func);
   };

   EmscriptenRunner.prototype.onReset = function (func) {
     this._hooks.reset.push(func);
   };

   EmscriptenRunner.prototype.requestFullScreen = function () {
     this._canvas.requestFullscreen();
   };

   /*
    * PC98DosBoxRunner
    */
   function PC98DosBoxRunner() {
     return EmscriptenRunner.apply(this, arguments);
   }
   PC98DosBoxRunner.prototype = Object.create(EmscriptenRunner.prototype);
   PC98DosBoxRunner.prototype.start = function () {
     FS.symlink('/emulator/y/FONT.ROM', '/FONT.ROM');
     FS.symlink('/emulator/y/2608_bd.wav', '/2608_bd.wav');
     FS.symlink('/emulator/y/2608_hh.wav', '/2608_hh.wav');
     FS.symlink('/emulator/y/2608_sd.wav', '/2608_sd.wav');
     FS.symlink('/emulator/y/2608_rim.wav', '/2608_rim.wav');
     FS.symlink('/emulator/y/2608_tom.wav', '/2608_tom.wav');
     FS.symlink('/emulator/y/2608_top.wav', '/2608_top.wav');
   };

   /*
   * NP2Runner
   */
   function NP2Runner() {
     return EmscriptenRunner.apply(this, arguments);
   }
   NP2Runner.prototype = Object.create(EmscriptenRunner.prototype);
   NP2Runner.prototype.start = function () {
     try {
       var configFile = FS.readFile('/emulator/np2.cfg');
       FS.writeFile('/emulator/np2/np2.cfg', configFile);
     } catch (ex) {
       //If the user config file not found, NP2 will use default settings
       console.log(ex);
     }
   };

   /*
    * MAMERunner
    */
   function MAMERunner() {
     return EmscriptenRunner.apply(this, arguments);
   }
   MAMERunner.prototype = Object.create(EmscriptenRunner.prototype,
                                        { mute: { value: function () {
                                                           var machine = Module.__ZN15running_machine30emscripten_get_running_machineEv();
                                                           var soundmgr = Module.__ZN15running_machine20emscripten_get_soundEv(machine);
                                                           Module.__ZN13sound_manager4muteEbh(soundmgr, true, 0x02); // MUTE_REASON_UI
                                                         },
                                                },
                                          unmute: { value: function () {
                                                             var machine = Module.__ZN15running_machine30emscripten_get_running_machineEv();
                                                             var soundmgr = Module.__ZN15running_machine20emscripten_get_soundEv(machine);
                                                             Module.__ZN13sound_manager4muteEbh(soundmgr, false, 0x02); // MUTE_REASON_UI
                                                           },
                                                  },
                                        });

   /*
    * SAERunner
    */
   function SAERunner(canvas, game_data) {
     this._sae = new ScriptedAmigaEmulator();
     this._cfg = this._sae.getConfig();
     this._canvas = canvas;

     var model = null;
     switch (game_data.amigaModel) {
       case "A500": model = SAEC_Model_A500; break;
       case "A500P": model = SAEC_Model_A500P; break;
       case "A600": model = SAEC_Model_A600; break;
       case "A1000": model = SAEC_Model_A1000; break;
       case "A1200": model = SAEC_Model_A1200; break;
       case "A2000": model = SAEC_Model_A2000; break;
       case "A3000": model = SAEC_Model_A3000; break;
       case "A4000": model = SAEC_Model_A4000; break;
       case "A4000T": model = SAEC_Model_A4000T; break;
       /*  future. do not use. cd-emulation is not implemented yet.
       case "CDTV": model = SAEC_Model_CDTV; break;
       case "CD32": model = SAEC_Model_CD32; break; */
     }
     this._sae.setModel(model, 0);
     this._cfg.memory.z2FastSize = game_data.fastMemory || 2 << 20;
     this._cfg.floppy.speed = SAEC_Config_Floppy_Speed_Turbo;
     this._cfg.video.id = canvas.getAttribute("id");

     if (game_data.nativeResolution && game_data.nativeResolution.height == 360 && game_data.nativeResolution.width == 284)
     {
       this._cfg.video.hresolution = SAEC_Config_Video_HResolution_LoRes;
       this._cfg.video.vresolution = SAEC_Config_Video_VResolution_NonDouble;
       this._cfg.video.size_win.width = SAEC_Video_DEF_AMIGA_WIDTH; /* 360 */
       this._cfg.video.size_win.height = SAEC_Video_DEF_AMIGA_HEIGHT; /* 284 */
     }
     else if (game_data.nativeResolution && game_data.nativeResolution.height == 1440 && game_data.nativeResolution.width == 568)
     {
       this._cfg.video.hresolution = SAEC_Config_Video_HResolution_SuperHiRes;
       this._cfg.video.vresolution = SAEC_Config_Video_VResolution_Double;
       this._cfg.video.size_win.width = SAEC_Video_DEF_AMIGA_WIDTH << 2; /* 1440 */
       this._cfg.video.size_win.height = SAEC_Video_DEF_AMIGA_HEIGHT << 1; /* 568 */
     }
     else
     {
       this._cfg.video.hresolution = SAEC_Config_Video_HResolution_HiRes;
       this._cfg.video.vresolution = SAEC_Config_Video_VResolution_Double;
       this._cfg.video.size_win.width = SAEC_Video_DEF_AMIGA_WIDTH << 1; /* 720 */
       this._cfg.video.size_win.height = SAEC_Video_DEF_AMIGA_HEIGHT << 1; /* 568 */
     }

     this._cfg.memory.rom.name = game_data.rom;
     this._cfg.memory.rom.data = game_data.fs.readFileSync('/'+game_data.rom, null, flag_r);
     this._cfg.memory.rom.size = this._cfg.memory.rom.data.length;

     if (game_data.extRom) {
       this._cfg.memory.extRom.name = game_data.extRom;
       this._cfg.memory.extRom.data = game_data.fs.readFileSync('/'+game_data.extRom, null, flag_r);
       this._cfg.memory.extRom.size = this._cfg.memory.extRom.data.length;
     }

     for (var i = 0; i < Object.keys(game_data.floppy).length; i++) {
       this._cfg.floppy.drive[i].file.name = game_data.floppy[i];
       this._cfg.floppy.drive[i].file.data = game_data.fs.readFileSync('/' + game_data.floppy[i], null, flag_r);
       this._cfg.floppy.drive[i].file.size = this._cfg.floppy.drive[i].file.data.length;
     }
   }

   SAERunner.prototype.start = function () {
     var err = this._sae.start();
   };

   SAERunner.prototype.pause = function () {
     this._sae.pause();
   };

   SAERunner.prototype.stop = function () {
     this._sae.stop();
   };

   SAERunner.prototype.mute = function () {
     var err = this._sae.mute(true);
     if (err) {
       console.warn("unable to mute; SAE error number", err);
     }
   };

   SAERunner.prototype.unmute = function () {
     var err = this._sae.mute(false);
     if (err) {
       console.warn("unable to unmute; SAE error number", err);
     }
   };

   SAERunner.prototype.onStarted = function (func) {
     this._cfg.hook.event.started = func;
   };

   SAERunner.prototype.onReset = function (func) {
     this._cfg.hook.event.reseted = func;
   };

   SAERunner.prototype.requestFullScreen = function () {
     getfullscreenenabler().call(this._canvas);
   };

   /*
    * V86Runner
    */
   function V86Runner(canvas, game_data) {
     // v86 needs a specific DOM structure instead of a canvas
     var screenContainerOuterElt = document.createElement("div");
     screenContainerOuterElt.id = canvas.id;
     screenContainerOuterElt.classList = canvas.classList;
     screenContainerOuterElt.style = canvas.style;

     var screenContainerInnerElt = document.createElement("div");
     screenContainerInnerElt.classList = ["emularity-v86-screen-container"];
     screenContainerInnerElt.style = "display:flex;justify-content:center;align-items:center;background-color:#000;";

     var textDivElt = document.createElement("div");
     textDivElt.classList = ["emularity-v86-screen-text"];
     textDivElt.style = "font-size:14px;font-family:monospace;line-height:14px;white-space:pre;";
     var canvasElt = document.createElement("canvas");
     canvasElt.classList = ["emularity-v86-screen-canvas"];
     canvasElt.style = "display:none;";

     screenContainerInnerElt.appendChild(textDivElt);
     screenContainerInnerElt.appendChild(canvasElt);
     screenContainerOuterElt.appendChild(screenContainerInnerElt);
     canvas.parentNode.replaceChild(screenContainerOuterElt, canvas);

     var cfg = {};
     cfg.screen_container = screenContainerInnerElt;
     cfg.memory_size = Math.floor(game_data.memory_size * 1024 * 1024);
     cfg.vga_memory_size = Math.floor(game_data.vga_memory_size * 1024 * 1024);
     cfg.acpi = game_data.acpi;
     cfg.boot_order = game_data.boot_order;

     cfg.autostart = true;
     cfg.wasm_fn = env => {
       return new Promise(async resolve => {
         const wasm = await WebAssembly.instantiate(game_data.wasmBinary, env);
         resolve(wasm.instance.exports);
       });
     };

     ["bios", "vga_bios", "fda", "fdb", "cdrom", "hda", "hdb"].forEach(key => {
       if (game_data[key] && game_data[key]["path"]) {
         cfg[key] = { buffer: game_data.fs.readFileSync('/' + game_data[key]["path"], null, flag_r).buffer, };
       }
     });

     var emu = new V86Starter(cfg);
     this._emulator = emu;
     this.ready = null;

     if (game_data["scale"]) {
       emu.screen_set_scale(game_data["scale"], game_data["scale"]);
     }

     screenContainerInnerElt.addEventListener('click',
                                              function (e) {
                                                emu.lock_mouse();
                                              });
   }

   V86Runner.prototype.start = function () {
     this._emulator.run();
   };

   V86Runner.prototype.pause = function () {
     this._emulator.stop();
   };

   V86Runner.prototype.stop = function () {
     this._emulator.stop();
   };

   V86Runner.prototype.mute = function () {
     if (this._emulator.is_muted) {
       this._emulator.speaker_adapter.mixer.set_volume(1, undefined);
       this._emulator.is_muted = false;
     }
   };

   V86Runner.prototype.unmute = function () {
     if (!this._emulator.is_muted) {
       this._emulator.speaker_adapter.mixer.set_volume(0, undefined);
       this._emulator.is_muted = true;
     }
   };

   V86Runner.prototype.onStarted = function (func) {
     this._emulator.add_listener("emulator-started", func);
   };

   V86Runner.prototype.onReset = function (func) {
     // not supported
   };

   V86Runner.prototype.requestFullScreen = function () {
     getfullscreenenabler().call(this._canvas);
   };

   /*
    * RuffleRunner
    */
   function RuffleRunner(canvas, game_data) {
     if (!game_data.swf_file_name) {
       let url = game_data.files[0].file.url;
       game_data.swf_file_name = url.slice(url.lastIndexOf('/'));
     }
     // read game data from file system
     let gamedata = game_data.fs.readFileSync(game_data.swf_file_name, null, flag_r);
     this.ready = null;

     let ruffle = RufflePlayer.newest();
     let player = ruffle.createPlayer();
     player.addEventListener('loadedmetadata', () => {
       player.style.width = player.metadata.width + "px";
       player.style.height = player.metadata.height + "px";
     });
     this._player = player;

     // copy atributes of canvas to player div
     for (let el of canvas.attributes){
       player.setAttribute(el.localName, el.nodeValue);
     }

     canvas.parentElement.replaceChild(player, canvas);
     player.load({ data: gamedata,
                   swfFileName: game_data.swf_file_name.replace('/', ''),
                   splashScreen: false
                 })
           .then(() => {
                   this.ready(); // clear screen
                 });
   }

   RuffleRunner.prototype.requestFullScreen = function () {
     this._player.enterFullscreen();
   };

   RuffleRunner.prototype.onReset =  function (func) {
   };

   RuffleRunner.prototype.start =  function (func) {
   };

   RuffleRunner.prototype.onStarted =  function (func) {
     this.ready = func;
   };

   RuffleRunner.prototype.mute = function() {
     this._player.volume = 0;
   };

   RuffleRunner.prototype.unmute = function() {
     this._player.volume = 1;
   };

   /*
    * CloudpilotRunner
    */
   function CloudpilotRunner(canvas, game_data) {
     // Assume we have one of each: *.bin (BIOS ROM), *.img (session image), *.prc (app database)
     if (game_data.bios) {
       this._biosFile = game_data.fs.readFileSync("/" + game_data.bios, null, flag_r);
     }
     if (game_data.session) {
       this._sessionFile = game_data.fs.readFileSync("/" + game_data.session, null, flag_r);
     }
     if (game_data.prc) {
       if (game_data.prc.match(/\.zip$/i)) {
         this._prcZip = game_data.fs.readFileSync("/" + game_data.prc, null, flag_r);
         this._prcFileName = game_data.prc.replace(/\.zip$/i, '.prc');
       } else {
         this._prcFile = game_data.fs.readFileSync("/" + game_data.prc, null, flag_r);
       }
     }
     this._canvas = canvas;
   }

   CloudpilotRunner.prototype.onReset =  function (func) {
   };

   CloudpilotRunner.prototype.start =  function (func) {
     var runner = this;
     cloudpilot.createEmulator()
               .then(function(emulator) {
                       emulator
                         .setCanvas(runner._canvas)
                         .bindInput(runner._canvas, runner._canvas);

                         if (runner._sessionFile && runner._prcFile) {
                           // Load booted image and install app.
                           emulator
                             .loadSession(runner._sessionFile)
                             .installAndLaunchDatabase(runner._prcFile);
                         } else if (runner._sessionFile && runner._prcZip) {
                           // Load booted image and install app.
                           emulator
                             .loadSession(runner._sessionFile)
                             .installFromZipfileAndLaunch(runner._prcZip, runner._prcFileName);
                         } else if (runner._biosFile) {
                           // Missing app .prc; load initial BIOS directly (Palm setup process).
                           emulator.loadRom(runner._biosFile);
                         }
                       emulator.resume();
                       runner._canvas.tabIndex = 0;
                       runner._canvas.style.outline = 0;
                       runner._canvas.focus();
                       runner._emulator = emulator;
                    });
   };

   CloudpilotRunner.prototype.onStarted =  function (func) {
     func();
   };

   CloudpilotRunner.prototype.mute = function() {
     if (this._emulator) {
       this._emulator.setVolume(0);
     }
   };

   CloudpilotRunner.prototype.unmute = function() {
     if (this._emulator) {
       if (!this._emulator.isAudioInitialized()) {
         this._emulator.initializeAudio();
       }
       this._emulator.setVolume(1);
     }
   };

   CloudpilotRunner.prototype.requestFullScreen = function () {
     getfullscreenenabler().call(this._canvas);
   };

   /**
    * Emulator
    */
   function Emulator(canvas, callbacks, loadFiles) {
     if (typeof callbacks !== 'object') {
       callbacks = { before_emulator: null,
                     before_run: callbacks };
     }
     var js_url;
     var requests = [];
     var drawloadingtimer;
     // TODO: Have an enum value that communicates the current state of the emulator, e.g. 'initializing', 'loading', 'running'.
     var has_started = false;
     var loading = false;
     var defaultSplashColors = { foreground: 'white',
                                 background: 'black',
                                 failure: 'red' };
     var splash = { loading_text: "",
                    spinning: true,
                    finished_loading: false,
                    colors: defaultSplashColors,
                    table: null,
                    splashimg: new Image() };

     var runner;

     var muted = false;
     this.isMuted = function () { return muted; };
     this.mute = function () { return this.setMute(true); };
     this.unmute = function () { return this.setMute(false); };
     this.toggleMute = function () { return this.setMute(!muted); };
     this.setMute = function (state) {
       muted = state;
       if (runner) {
         if (state) {
           runner.mute();
         } else {
           runner.unmute();
         }
       }
       else {
         try {
           if (!window.SDL_PauseAudio)
             window.SDL_PauseAudio = Module.cwrap('SDL_PauseAudio', '', ['number']);
           window.SDL_PauseAudio(state);
         } catch (x) {
           console.log("Unable to change audio state:", x);
         }
       }
       return this;
     };

     // This is the bare minimum that will allow gamepads to work. If
     // we don't listen for them then the browser won't tell us about
     // them.
     // TODO: add hooks so that some kind of UI can be displayed.
     window.addEventListener("gamepadconnected",
                             function (e) {
                               console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
                                           e.gamepad.index, e.gamepad.id,
                                           e.gamepad.buttons.length, e.gamepad.axes.length);
                             });

     window.addEventListener("gamepaddisconnected",
                             function (e) {
                               console.log("Gamepad disconnected from index %d: %s",
                                           e.gamepad.index, e.gamepad.id);
                             });

     var css_resolution, aspectRatio;
     // right off the bat we set the canvas's inner dimensions to
     // whatever it's current css dimensions are; this isn't likely to be
     // the same size that dosbox/jsmame will set it to, but it avoids
     // the case where the size was left at the default 300x150
     if (!canvas.hasAttribute("width")) {
       var style = getComputedStyle(canvas);
       canvas.width = parseInt(style.width, 10);
       canvas.height = parseInt(style.height, 10);
     }

     this.setScale = function(_scale) {
       console.warn("setScale method is deprecated; use the BaseLoader.scale method instead");
       return this;
     };

     this.setSplashImage = function(_splashimg) {
       if (_splashimg) {
         if (_splashimg instanceof Image) {
           if (splash.splashimg.parentNode) {
             splash.splashimg.src = _splashimg.src;
           } else {
             splash.splashimg = _splashimg;
           }
         } else {
           splash.splashimg.src = _splashimg;
         }
       }
       return this;
     };

     this.setCSSResolution = function(_resolution) {
       css_resolution = _resolution;
       return this;
     };

     this.setAspectRatio = function(_aspectRatio) {
       aspectRatio = _aspectRatio;
       return this;
     };

     this.setCallbacks = function(_callbacks) {
       if (typeof _callbacks !== 'object') {
         callbacks = { before_emulator: null,
                       before_run: _callbacks };
       } else {
         callbacks = _callbacks;
       }
       return this;
     };

     this.setSplashColors = function (colors) {
       splash.colors = colors;
       return this;
     };

     this.setLoad = function (loadFunc) {
       loadFiles = loadFunc;
       return this;
     };

     var start = function (options) {
       if (has_started)
         return false;
       has_started = true;
       var defaultOptions = { waitAfterDownloading: false,
                              hasCustomCSS: false };
       if (typeof options !== 'object') {
         options = defaultOptions;
       } else {
         options.__proto__ = defaultOptions;
       }

       var k, c, game_data;
       setupSplash(canvas, splash, options);
       drawsplash();

       var loading;

       if (typeof loadFiles === 'function') {
         loading = loadFiles(fetch_file, splash);
       } else {
         loading = Promise.resolve(loadFiles);
       }
       loading.then(function (_game_data) {
                      return new Promise(function(resolve, reject) {
                        var InMemoryFS = BrowserFS.FileSystem.InMemory;
                        InMemoryFS.Create(function (e, inMemory) {
                          // If the browser supports IndexedDB storage, mirror writes to that storage
                          // for persistence purposes.
                          if (BrowserFS.FileSystem.IndexedDB.isAvailable()) {
                            var AsyncMirrorFS = BrowserFS.FileSystem.AsyncMirror,
                                IndexedDBFS = BrowserFS.FileSystem.IndexedDB,
                                fileSystemKey = "fileSystemKey" in _game_data ? _game_data.fileSystemKey
                                                                              : "emularity";
                            IndexedDBFS.Create({ storeName: fileSystemKey },
                                               function(e, idbfs) {
                                                 if (e) {
                                                   finish(e, inMemory);
                                                 } else {
                                                   AsyncMirrorFS.Create({ sync: inMemory, async: idbfs },
                                                                        finish);
                                                 }
                                               });
                          } else {
                            finish(e, inMemory);
                          }
                        });

                        function finish(e, deltaFS) {
                          game_data = _game_data;

                          // Any file system writes to MountableFileSystem will be written to the
                          // deltaFS, letting us mount read-only zip files into the MountableFileSystem
                          // while being able to "write" to them.
                          var MountableFS = BrowserFS.FileSystem.MountableFileSystem,
                              OverlayFS = BrowserFS.FileSystem.OverlayFS,
                              ZipFS = BrowserFS.FileSystem.ZipFS,
                              Buffer = BrowserFS.BFSRequire('buffer').Buffer;
                          MountableFS.Create(function (e, mountable) {
                            OverlayFS.Create({ readable: mountable
                                             , writable: deltaFS
                                             },
                                             function (e, fs) {
                                               if (e) {
                                                 console.error("Failed to initialize the OverlayFS:", e);
                                                 reject();
                                               } else {
                                                 game_data.fs = fs;
                                                 function fetch(file) {
                                                   var isCached = 'cached' in file && file.cached,
                                                       hasData = 'data' in file && file.data !== null && typeof file.data !== 'undefined';
                                                   if (isCached || hasData) {
                                                     return cached_file(file.title, file.data);
                                                   } else {
                                                     return fetch_file(file.title, file.url, 'arraybuffer', file.optional);
                                                   }
                                                 }
                                                 function mountat(drive) {
                                                   return function (data) {
                                                     if (data !== null) {
                                                       drive = drive.toLowerCase();
                                                       var mountpoint = '/'+ drive;
                                                       // Mount into RO MFS.
                                                       return new Promise(function (resolve, reject) {
                                                         return new ZipFS.Create({ zipData: new Buffer(data) },
                                                                                 function (e, fs) {
                                                                                   if (e) {
                                                                                     reject();
                                                                                   } else {
                                                                                     mountable.mount(mountpoint, fs);
                                                                                     resolve();
                                                                                   }
                                                                                 });
                                                       });
                                                     }
                                                   };
                                                 }
                                                 function saveat(filename) {
                                                   return function (data) {
                                                     if (data !== null) {
                                                       if (deltaFS.existsSync(filename)) {
                                                         return;
                                                       }
                                                       if (filename.includes('/', 1)) {
                                                         var parts = filename.substring(1).split('/');
                                                         for (var i = 1; i < parts.length; i++) {
                                                           var path = '/'+ parts.slice(0, i).join('/');
                                                           if (!deltaFS.existsSync(path)) {
                                                             deltaFS.mkdirSync(path, 0o777);
                                                           }
                                                         }
                                                       }
                                                       deltaFS.writeFileSync(filename, new Buffer(data), null, flag_w, 0o644);
                                                     }
                                                   };
                                                 }
                                                 var promises = game_data.files
                                                                         .map(function (f) {
                                                                                if (f && f.file) {
                                                                                  if (f.drive) {
                                                                                    return fetch(f.file).then(mountat(f.drive));
                                                                                  } else if (f.mountpoint) {
                                                                                    var path = f.mountpoint[0] != '/' ? '/'+ f.mountpoint : f.mountpoint;
                                                                                    f.file.cached = deltaFS.existsSync(path);
                                                                                    return fetch(f.file).then(saveat(path));
                                                                                  }
                                                                                }
                                                                                return null;
                                                                              });
                                                 // this is kinda wrong; it really only applies when we're loading something created by Emscripten
                                                 if ('emulatorWASM' in game_data && game_data.emulatorWASM && 'WebAssembly' in window) {
                                                   promises.push(fetch({ title: "WASM Binary", url: game_data.emulatorWASM }).then(function (data) { game_data.wasmBinary = data; }));
                                                 }
                                                 Promise.all(promises).then(resolve, reject);
                                               }
                                             });
                          });
                        }
                      });
                    })
              .then(function (game_files) {
                      if (!game_data || splash.failed_loading) {
                        return null;
                      }
                      if (options.waitAfterDownloading) {
                        return new Promise(function (resolve, reject) {
                                             splash.setTitle("Press any key to continue...");
                                             splash.spinning = false;

                                             // stashes these event listeners so that we can remove them after
                                             window.addEventListener('keypress', k = keyevent(resolve));
                                             canvas.addEventListener('click', c = resolve);
                                             splash.splashElt.addEventListener('click', c);
                                           });
                      }
                      return Promise.resolve();
                    },
                    function () {
                      if (splash.failed_loading) {
                        return;
                      }
                      splash.setTitle("Failed to download game data!");
                      splash.failed_loading = true;
                    })
              .then(function () {
                      if (!game_data || splash.failed_loading) {
                        return null;
                      }
                      splash.spinning = true;
                      window.removeEventListener('keypress', k);
                      canvas.removeEventListener('click', c);
                      splash.splashElt.removeEventListener('click', c);

                      // Don't let arrow, pg up/down, home, end affect page position
                      blockSomeKeys();
                      setupFullScreen();
                      disableRightClickContextMenu(canvas);

                      // Emscripten doesn't use the proper prefixed functions for fullscreen requests,
                      // so let's map the prefixed versions to the correct function.
                      canvas.requestPointerLock = getpointerlockenabler();

                      moveConfigToRoot(game_data.fs);

                      if (callbacks && callbacks.before_emulator) {
                        try {
                          callbacks.before_emulator();
                        } catch (x) {
                          console.log(x);
                        }
                      }

                      if ("runner" in game_data) {
                        if (game_data.runner == EmscriptenRunner || game_data.runner.prototype instanceof EmscriptenRunner) {
                          // this is a stupid hack. Emscripten-based
                          // apps currently need the runner to be set
                          // up first, then we can attach the
                          // script. The others have to do it the
                          // other way around.
                          runner = setup_runner();
                        }
                      }

                      if (game_data.emulatorJS) {
                        splash.setTitle("Launching Emulator");
                        return attach_script(game_data.emulatorJS);
                      } else {
                        splash.setTitle("Non-system disk or disk error");
                      }
                      return null;
                    },
                    function () {
                      if (!game_data || splash.failed_loading) {
                        return null;
                      }
                      splash.setTitle("Invalid media, track 0 bad or unusable");
                      splash.failed_loading = true;
                    })
              .then(function () {
                      if (!game_data || splash.failed_loading) {
                        return null;
                      }
                      if ("runner" in game_data) {
                        if (!runner) {
                          runner = setup_runner();
                        }
                        runner.start();
                      }
                    });

       function setup_runner() {
         var runner = new game_data.runner(canvas, game_data);
         resizeCanvas(canvas, game_data.scale, game_data.nativeResolution, game_data.aspectRatio);
         runner.onStarted(function () {
                            splash.finished_loading = true;
                            splash.hide();
                            setTimeout(function() {
                                         if (muted) {
                                           runner.mute();
                                         }
                                         if (callbacks && callbacks.before_run) {
                                           callbacks.before_run();
                                         }
                                       },
                                       0);
                          });
         runner.onReset(function () {
                          if (muted) {
                            runner.mute();
                          }
                        });
         return runner;
       }

       return this;
     };
     this.start = start;

     var formatSize = function (event) {
       if (event.lengthComputable)
         return "("+ (event.total ? (event.loaded / event.total * 100).toFixed(0)
                                  : "100") +
                "%; "+ formatBytes(event.loaded) +
                " of "+ formatBytes(event.total) +")";
       return "("+ formatBytes(event.loaded) +")";
     };

     var formatBytes = function (bytes, base10) {
         if (bytes === 0)
           return "0 B";
         var unit = base10 ? 1000 : 1024,
             units = base10 ? ["B", "kB","MB","GB","TB","PB","EB","ZB","YB"]
                            : ["B", "KiB","MiB","GiB","TiB","PiB","EiB","ZiB","YiB"],
             exp = parseInt((Math.log(bytes) / Math.log(unit))),
             size = bytes / Math.pow(unit, exp);
         return size.toFixed(1) +' '+ units[exp];
     };

     var fetch_file = function (title, url, rt, optional) {
       return _fetch_file(title, url, rt, optional, false);
     };

     var cached_file = function (title, data) {
       return _fetch_file(title, data, null, false, true);
     };

     var _fetch_file = function (title, url, rt, optional, cached) {
       var needsCSS = splash.table.dataset.hasCustomCSS == "false";
       var row = addRow(splash.table);
       var titleCell = row[0], statusCell = row[1];
       titleCell.textContent = title;
       return new Promise(function (resolve, reject) {
                            if (cached) {
                              success();
                              resolve(url); // second parameter reused as a pass–through
                            } else {
                              var xhr = new XMLHttpRequest();
                              xhr.open('GET', url, true);
                              xhr.responseType = rt || 'arraybuffer';
                              xhr.onprogress = function (e) {
                                                 titleCell.innerHTML = title +" <span style=\"font-size: smaller\">"+ formatSize(e) +"</span>";
                                               };
                              xhr.onload = function (e) {
                                             if (xhr.status === 200) {
                                               success();
                                               resolve(xhr.response);
                                             } else if (optional) {
                                               success();
                                               resolve(null);
                                             } else {
                                               failure();
                                               reject();
                                             }
                                           };
                              xhr.onerror = function (e) {
                                              if (optional) {
                                                success();
                                                resolve(null);
                                              } else {
                                                failure();
                                                reject();
                                              }
                                            };
                              xhr.send();
                            }
                          });
       function success() {
         statusCell.textContent = "✔";
         titleCell.parentNode.classList.add('emularity-download-success');
         titleCell.textContent = title;
         if (needsCSS) {
           titleCell.style.fontWeight = 'bold';
           titleCell.parentNode.style.backgroundColor = splash.getColor('foreground');
           titleCell.parentNode.style.color = splash.getColor('background');
         }
       }
       function failure() {
         statusCell.textContent = "✘";
         titleCell.parentNode.classList.add('emularity-download-failure');
         titleCell.textContent = title;
         if (needsCSS) {
           titleCell.style.fontWeight = 'bold';
           titleCell.parentNode.style.backgroundColor = splash.getColor('failure');
           titleCell.parentNode.style.color = splash.getColor('background');
         }
       }
     };

     function keyevent(resolve) {
       return function (e) {
                if (e.which == 32) {
                  e.preventDefault();
                  resolve();
                }
              };
     };

     var resizeCanvas = function (canvas, scale, resolution, aspectRatio) {
       if (scale && resolution) {
         // optimizeSpeed is the standardized value. different
         // browsers support different values; they will all ignore
         // values that they don't understand.
         canvas.style.imageRendering = '-moz-crisp-edges';
         canvas.style.imageRendering = '-o-crisp-edges';
         canvas.style.imageRendering = '-webkit-optimize-contrast';
         canvas.style.imageRendering = 'optimize-contrast';
         canvas.style.imageRendering = 'crisp-edges';
         canvas.style.imageRendering = 'pixelated';
         canvas.style.imageRendering = 'optimizeSpeed';

         canvas.style.width = resolution.width * scale +'px';
         canvas.style.height = resolution.height * scale +'px';
         canvas.setAttribute("width", resolution.width * scale);
         canvas.setAttribute("height", resolution.height * scale);
       }
     };

     var clearCanvas = function () {
       var context = canvas.getContext('2d');
       context.fillStyle = splash.getColor('background');
       context.fillRect(0, 0, canvas.width, canvas.height);
       console.log("canvas cleared");
     };

     function setupSplash(canvas, splash, globalOptions) {
       splash.splashElt = document.getElementById("emularity-splash-screen");
       if (!splash.splashElt) {
         splash.splashElt = document.createElement('div');
         splash.splashElt.classList.add("emularity-splash-screen");
         if (!globalOptions.hasCustomCSS) {
           splash.splashElt.style.position = 'absolute';
           splash.splashElt.style.top = '0';
           splash.splashElt.style.left = '0';
           splash.splashElt.style.right = '0';
           splash.splashElt.style.color = splash.getColor('foreground');
           splash.splashElt.style.backgroundColor = splash.getColor('background');
         }
         canvas.parentElement.appendChild(splash.splashElt);
       }

       splash.splashimg.classList.add("emularity-splash-image");
       if (!globalOptions.hasCustomCSS) {
         splash.splashimg.style.display = 'block';
         splash.splashimg.style.marginLeft = 'auto';
         splash.splashimg.style.marginRight = 'auto';
       }
       splash.splashElt.appendChild(splash.splashimg);

       splash.titleElt = document.createElement('span');
       splash.titleElt.classList.add("emularity-splash-title");
       if (!globalOptions.hasCustomCSS) {
         splash.titleElt.style.display = 'block';
         splash.titleElt.style.width = '100%';
         splash.titleElt.style.marginTop = "1em";
         splash.titleElt.style.marginBottom = "1em";
         splash.titleElt.style.textAlign = 'center';
         splash.titleElt.style.font = "24px sans-serif";
       }
       splash.titleElt.textContent = " ";
       splash.splashElt.appendChild(splash.titleElt);

       var table = document.getElementById("emularity-progress-indicator");
       if (!table) {
         table = document.createElement('table');
         table.classList.add("emularity-progress-indicator");
         table.dataset.hasCustomCSS = globalOptions.hasCustomCSS;
         if (!globalOptions.hasCustomCSS) {
           table.style.width = "75%";
           table.style.color = splash.getColor('foreground');
           table.style.backgroundColor = splash.getColor('background');
           table.style.marginLeft = 'auto';
           table.style.marginRight = 'auto';
           table.style.borderCollapse = 'separate';
           table.style.borderSpacing = "2px";
         }
         splash.splashElt.appendChild(table);
       }
       splash.table = table;
     }

     splash.setTitle = function (title) {
       splash.titleElt.textContent = title;
     };

     splash.hide = function () {
       splash.splashElt.style.display = 'none';
     };

     splash.getColor = function (name) {
       return name in splash.colors ? splash.colors[name]
                                    : defaultSplashColors[name];
     };

     var addRow = function (table) {
       var needsCSS = table.dataset.hasCustomCSS == "false";
       var row = table.insertRow(-1);
       if (needsCSS) {
         row.style.textAlign = 'center';
       }
       var cell = row.insertCell(-1);
       if (needsCSS) {
         cell.style.position = 'relative';
       }
       var titleCell = document.createElement('span');
       titleCell.classList.add("emularity-download-title");
       titleCell.textContent = '—';
       if (needsCSS) {
         titleCell.style.verticalAlign = 'center';
         titleCell.style.minHeight = "24px";
         titleCell.style.whiteSpace = "nowrap";
       }
       cell.appendChild(titleCell);
       var statusCell = document.createElement('span');
       statusCell.classList.add("emularity-download-status");
       if (needsCSS) {
         statusCell.style.position = 'absolute';
         statusCell.style.left = "0";
         statusCell.style.paddingLeft = "0.5em";
       }
       cell.appendChild(statusCell);
       return [titleCell, statusCell];
     };

     var drawsplash = function () {
       canvas.setAttribute('moz-opaque', '');
       if (!splash.splashimg.src) {
         splash.splashimg.src = "logo/emularity_color_small.png";
       }
     };

     function attach_script(js_url) {
       return new Promise(function (resolve, reject) {
                            var newScript;
                            function loaded(e) {
                              if (e.target == newScript) {
                                newScript.removeEventListener("load", loaded);
                                newScript.removeEventListener("error", failed);
                                resolve();
                              }
                            }
                            function failed(e) {
                              if (e.target == newScript) {
                                newScript.removeEventListener("load", loaded);
                                newScript.removeEventListener("error", failed);
                                reject();
                              }
                            }
                            if (js_url) {
                              var head = document.getElementsByTagName('head')[0];
                              newScript = document.createElement('script');
                              newScript.addEventListener("load", loaded);
                              newScript.addEventListener("error", failed);
                              newScript.type = 'text/javascript';
                              newScript.src = js_url;
                              head.appendChild(newScript);
                            }
                          });
     }

     function getpointerlockenabler() {
       return canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
     }

     this.isfullscreensupported = function () {
        return !!(getfullscreenenabler());
     };

     function setupFullScreen() {
       var self = this;
       var fullScreenChangeHandler = function() {
                                       if (!(document.mozFullScreenElement || document.fullScreenElement)) {
                                         resizeCanvas(canvas, scale, css_resolution, aspectRatio);
                                       }
                                     };
       if ('onfullscreenchange' in document) {
         document.addEventListener('fullscreenchange', fullScreenChangeHandler);
       } else if ('onmozfullscreenchange' in document) {
         document.addEventListener('mozfullscreenchange', fullScreenChangeHandler);
       } else if ('onwebkitfullscreenchange' in document) {
         document.addEventListener('webkitfullscreenchange', fullScreenChangeHandler);
       }
     };

     this.requestFullScreen = function () {
       if (runner) {
         runner.requestFullScreen();
       }
     };

     /**
       * Prevents page navigation keys such as page up/page down from
       * moving the page while the user is playing.
       */
     function blockSomeKeys() {
       function keypress (e) {
         if (e.which >= 33 && e.which <= 40) {
           e.preventDefault();
           return false;
         }
         return true;
       }
       window.onkeydown = keypress;
     }

     /**
       * Disables the right click menu for the given element.
       */
     function disableRightClickContextMenu(element) {
       element.addEventListener('contextmenu',
                                function (e) {
                                  if (e.button == 2) {
                                    // Block right-click menu thru preventing default action.
                                    e.preventDefault();
                                  }
                                });
     }
   };

   /**
    * misc
    */
   function getfullscreenenabler() {
     return canvas.requestFullScreen || canvas.webkitRequestFullScreen || canvas.mozRequestFullScreen;
   }

   // This is such a hack. We're not calling the BrowserFS api
   // "correctly", so we have to synthesize these flags ourselves
   var flag_r = { isReadable: function() { return true; },
                  isWriteable: function() { return false; },
                  isTruncating: function() { return false; },
                  isAppendable: function() { return false; },
                  isSynchronous: function() { return false; },
                  isExclusive: function() { return false; },
                  pathExistsAction: function() { return 0; },
                  pathNotExistsAction: function() { return 1; }
                };
   var flag_w = { isReadable: function() { return false; },
                  isWriteable: function() { return true; },
                  isTruncating: function() { return false; },
                  isAppendable: function() { return false; },
                  isSynchronous: function() { return false; },
                  isExclusive: function() { return false; },
                  pathExistsAction: function() { return 0; },
                  pathNotExistsAction: function() { return 3; }
                };

   /**
    * Searches for dosbox.conf, and moves it to '/dosbox.conf' so dosbox uses it.
    */
   function moveConfigToRoot(fs) {
     var dosboxConfPath = null;
     // Recursively search for dosbox.conf.
     function searchDirectory(dirPath) {
       fs.readdirSync(dirPath).forEach(function(item) {
         if (dosboxConfPath) {
           return;
         }
         // Avoid infinite recursion by ignoring these entries, which exist at
         // the root.
         if (item === '.' || item === '..') {
           return;
         }
         // Append '/' between dirPath and the item's name... unless dirPath
         // already ends in it (which always occurs if dirPath is the root, '/').
         var itemPath = dirPath + (dirPath[dirPath.length - 1] !== '/' ? "/" : "") + item,
             itemStat = fs.statSync(itemPath);
         if (itemStat.isDirectory(itemStat.mode)) {
           searchDirectory(itemPath);
         } else if (item === 'dosbox.conf') {
           dosboxConfPath = itemPath;
         }
       });
     }

     searchDirectory('/');

     if (dosboxConfPath !== null) {
       fs.writeFileSync('/dosbox.conf',
                        fs.readFileSync(dosboxConfPath, null, flag_r),
                        null, flag_w, 0x1a4);
     }
   };

   function extend(a, b) {
     if (a === null)
       return b;
     if (b === null)
       return a;
     var ta = typeof a,
         tb = typeof b;
     if (ta !== tb) {
       if (ta === 'undefined')
         return b;
       if (tb === 'undefined')
         return a;
       throw new Error("Cannot extend an "+ ta +" with an "+ tb);
     }
     if (Array.isArray(a))
       return a.concat(b);
     if (ta === 'object') {
       Object.keys(b).forEach(function (k) {
                                a[k] = extend(k in a ? a[k] : undefined, b[k]);
                              });
       return a;
     }
     return b;
   }

   function dict_from_xml(xml) {
     if (xml instanceof XMLDocument) {
       xml = xml.documentElement;
     }
     var dict = {};
     var len = xml.childNodes.length, i;
     for (i = 0; i < len; i++) {
       var node = xml.childNodes[i];
       dict[node.nodeName] = node.textContent;
     }
     return dict;
   }

   function list_from_xml(xml) {
     if (xml instanceof XMLDocument) {
       xml = xml.documentElement;
     }
     return Array.prototype.slice.call(xml.childNodes);
   }

   function files_from_filelist(xml) {
     return list_from_xml(xml).filter(function (node) {
                                        return "getAttribute" in node;
                                      })
                              .map(function (node) {
                                     var file = dict_from_xml(node);
                                     file.name = node.getAttribute("name");
                                     return file;
                              });
   }

   function files_with_ext_from_filelist(xml, ext) {
     if (!ext) {
       return [];
     }
     if (!ext.startsWith('.')) {
       ext = '.'+ ext;
     }
     ext = ext.toLowerCase();
     return files_from_filelist(xml).filter(function (file) {
                                              return file.name.toLowerCase().endsWith(ext);
                                            });
   }

   function meta_props_matching(meta, regex) {
     if (typeof regex == "string")
       regex = RegExp(regex);
     return Object.keys(meta).map(function (k) {
                                    var match = regex.exec(k);
                                    if (match)
                                      return [k, match];
                                    return null;
                                  })
                             .filter(function (result) {
                               return !!result;
                             });
   }

   function _SDL_CreateRGBSurfaceFrom(pixels, width, height, depth, pitch, rmask, gmask, bmask, amask) {
     // TODO: Actually fill pixel data to created surface.
     // TODO: Take into account depth and pitch parameters.
     // console.log('TODO: Partially unimplemented SDL_CreateRGBSurfaceFrom called!');
     var surface = SDL.makeSurface(width, height, 0, false, 'CreateRGBSurfaceFrom', rmask, gmask, bmask, amask);

     var surfaceData = SDL.surfaces[surface];
     var surfaceImageData = surfaceData.ctx.getImageData(0, 0, width, height);
     var surfacePixelData = surfaceImageData.data;

     // Fill pixel data to created surface.
     // Supports SDL_PIXELFORMAT_RGBA8888 and SDL_PIXELFORMAT_RGB888
     var channels = amask ? 4 : 3; // RGBA8888 or RGB888
     for (var pixelOffset = 0; pixelOffset < width*height; pixelOffset++) {
       surfacePixelData[pixelOffset*4+0] = HEAPU8[pixels + (pixelOffset*channels+0)]; // R
       surfacePixelData[pixelOffset*4+1] = HEAPU8[pixels + (pixelOffset*channels+1)]; // G
       surfacePixelData[pixelOffset*4+2] = HEAPU8[pixels + (pixelOffset*channels+2)]; // B
       surfacePixelData[pixelOffset*4+3] = amask ? HEAPU8[pixels + (pixelOffset*channels+3)] : 0xff; // A
     };

     surfaceData.ctx.putImageData(surfaceImageData, 0, 0);

     return surface;
   }

   window.IALoader = IALoader;
   window.DosBoxLoader = DosBoxLoader;
   window.PC98DosBoxLoader = PC98DosBoxLoader;
   window.JSMESSLoader = MAMELoader; // depreciated; just for backwards compatibility
   window.JSMAMELoader = MAMELoader; // ditto
   window.MAMELoader = MAMELoader;
   window.SAELoader = SAELoader;
   window.PCELoader = PCELoader;
   window.VICELoader = VICELoader;
   window.NP2Loader = NP2Loader;
   window.V86Loader = V86Loader;
   window.RuffleLoader = RuffleLoader;
   window.CloudpilotLoader = CloudpilotLoader;
   window.Emulator = Emulator;
   window._SDL_CreateRGBSurfaceFrom = _SDL_CreateRGBSurfaceFrom;
 })(typeof Promise === 'undefined' ? ES6Promise.Promise : Promise);

// legacy
var JSMESS = JSMESS || {};
JSMESS.ready = function (f) { f(); };

// Local Variables:
// js-indent-level: 2
// End:
