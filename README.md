# IA S/W Emulation

# How does this all work
The files are grouped and split up into 3 GitHub repositories (linked below) and corresponding deploys.

## GitHub Actions

Internet Archive is using docker OCI containers to serve the repo files as static files,
with a lightly customized `nginx` httpd server.  Each deployed container is running on a
[nomad](https://github.com/internetarchive/hind) cluster.

Each `git push` to this repo will cause a [GitHub Actions](../../actions) CI/CD
[pipeline](.github/workflows/cicd.yml) to run.
Presently, it does a [build] and [deploy] pair of jobs.
(See [CI/CD GitHub Action for more info](https://github.com/internetarchive/cicd).)

## loader.js

The main ringleader from an archive.org/details/ page for a s/w emulation "item" will load
[loader.js](https://github.com/internetarchive/emularity-engine/blob/main/loader.js).

## browserFS
There is a parallel
[browserfs.min.js](https://github.com/internetarchive/emularity-engine/blob/main/browserfs.min.js)
file that gets loaded alongside `loader.js`.
It is used for `node` backend-like FileSystem operations like reading and writing files,
in the context of the browser.
Tracey thinks this came from here:
- https://www.npmjs.com/package/browserfs
and notes the `browserfs.min.js*` file pair have a fix from db48x *after*
the v1.4.3.  Likely worth looking into the near future if/as needed.
browserFS can use "ES Modules" for JS import/loading via something like:
```js
import BrowserFS from 'https://esm.sh/browserfs'
```

## nginx
Each repo has the same layout, with all files starting at the top dir:
- [README.md](README.md) - this file
- [default.conf](default.conf) - nginx configuration
- [Dockerfile](Dockerfile) - container build instructions
- [.dockerignore](.dockerignore) - files to skip copying into the deployed container
- [.gitignore](.gitignore) - any files to ignore and not checkin
- [.github/workflows/cicd.yml](.github/workflows/cicd.yml) - GitHub Actions setup
We aim to keep all 3 repos with the same 6 files.

the nginx has a few critical changes for the handling of `.gz` files -- since nginx can *also*
"gzip on the fly" text files as well.  Thus, the browser needs to know if the file is being
dynamically turned to a `.gz` file by `nginx` -- or if the file is being served as an already
compressed `.gz` as a static file.

## example items
- typical type of item:
https://ia-petabox.archive.org/details/gg_Star_Wars_1993LucasArts_Tiertex_Design_Studio_U.S._GoldUS

- most challenging new `ruffle` type of item:
https://ia-petabox.archive.org/details/flash_loituma

## current deployments - production uses the `main` branch:
- https://emularity-engine.ux-b.archive.org/
- https://emularity-config.ux-b.archive.org/
- https://emularity-bios.ux-b.archive.org/

## there are 3 related git repos & deployments:
- https://github.com/internetarchive/emularity-engine
- https://github.com/internetarchive/emularity-config
- https://github.com/internetarchive/emularity-bios

## prior archive.org source items with setup files:
- https://archive.org/serve/emularity_engine_v1
- https://archive.org/serve/emularity_config_v1
- https://archive.org/serve/emularity_bios_v1
