# emularity-config

Static files for archive.org software emulation. This is one of three repos, each deployed as its own site:

- [emularity-engine](https://github.com/internetarchive/emularity-engine): emulator cores, per-game `.json` configs, `browserfs.min.js`
- emularity-config (this repo): `loader.js`, `.cfg` files, on-screen keyboard scripts
- [emularity-bios](https://github.com/internetarchive/emularity-bios): BIOS and ROM files

Production uses the `main` branch of each:

- https://emularity-engine.ux-b.archive.org/
- https://emularity-config.ux-b.archive.org/
- https://emularity-bios.ux-b.archive.org/

## What's here

Everything is served from the site root, so the file paths are the URLs. Don't move or rename a file without checking who requests it (see below).

- `loader.js`: the loader that archive.org's emulation item pages run. It sets `window.IALoader` and the per-emulator loaders.
- `*.cfg`: one per emulator module, fetched by `loader.js` as `/<module>.cfg`. Almost all of them are empty. The loader treats them as optional.
- `jsmess_keyboard_v2/`: on-screen keyboard scripts, requested by `jsmess-keyboard.js` and `<keyboard>.js`.
- `*.json`, `emularity_config_v1_meta.sqlite`, images, `gb.conf`, `loader.js.diff`: leftovers from when these files lived in the `emularity_config_v1` item. Nothing requests them.
- `default.conf`, `Dockerfile`, `.dockerignore`: the nginx container.

## Who requests these files

- petabox `components/entry/emulation.js` loads `loader.js` and `jsmess_keyboard_v2/*.js`. On archive.org the path is `/services/emularity/config/`, proxied to this site by `etc/nginx/petabox/webnode/proxy.d/emularity-proxy.conf`.
- offshoot `software-player.ts` loads `/loader.js` and `/jsmess_keyboard_v2/*.js`.
- `loader.js` itself requests `/<module>.cfg`.
- Cached or older copies of `loader.js` keep requesting the same root URLs, so a removed file is a production break even if nothing in these repos mentions it.

## Deploy

Every push runs [cicd.yml](.github/workflows/cicd.yml), which builds the container and deploys it to the [nomad](https://github.com/internetarchive/hind) cluster. Pushing `main` goes to production. See [internetarchive/cicd](https://github.com/internetarchive/cicd).

nginx serves the files as is. `default.conf` has the CORS headers, and special handling for `.gz` files so the browser knows whether the file is compressed on the fly or already a `.gz`. `.dockerignore` lists what stays out of the container.

## CI

[ci.yml](.github/workflows/ci.yml) runs on pull requests. It builds the container, runs `nginx -t`, then serves it and checks that every file on `main` that's served still returns 200 with the same bytes and `Access-Control-Allow-Origin: *`.

It only protects `main` if it's a required check in the branch protection settings.

To drop a file on purpose, add its path to `.github/url-parity-removed.txt` in the same PR.

Run it locally:

```sh
docker build -t emularity-config:ci .
docker run -d --name site -p 8080:80 emularity-config:ci
python3 scripts/check-url-parity.py http://localhost:8080 origin/main
docker rm -f site
```

## browserFS

`browserfs.min.js` lives in emularity-engine and is loaded alongside `loader.js`. It gives the emulators `node`-style filesystem calls in the browser. It's [browserfs](https://www.npmjs.com/package/browserfs) 1.4.3 plus a fix from db48x.

## Example items

- https://ia-petabox.archive.org/details/gg_Star_Wars_1993LucasArts_Tiertex_Design_Studio_U.S._GoldUS
- https://ia-petabox.archive.org/details/flash_loituma (a `ruffle` item)

## Older copies

- https://archive.org/serve/emularity_engine_v1
- https://archive.org/serve/emularity_config_v1
- https://archive.org/serve/emularity_bios_v1
