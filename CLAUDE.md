# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Manifest V3 Chrome extension that adds a right-click context menu to save X (Twitter) images at original size, sorted into `Downloads/x-img/<username>/` folders. It also records each user's display-name history and writes a `profile.json` sidecar per user.

## Build

There is no npm build script. Source is TypeScript in `src/`; the loadable extension is `dist/`, which is **committed to git**. The pipeline compiles TS to `.intermediate/`, then gulp minifies (terser) and copies into `dist/`.

```bash
# Compile both TS projects (scripts + popup)
npx tsc -p tsconfig.json          # src/scripts/*  -> .intermediate/*
npx tsc -p tsconfig.popup.json    # src/popup/*    -> .intermediate/popup/*

# Bundle into dist/ (any subset of tasks)
npx gulp js         # .intermediate/*.js       -> dist/scripts (minified)
npx gulp popupJs    # .intermediate/popup/*.js -> dist/popup   (minified)
npx gulp copy       # manifest.json + icons    -> dist/
npx gulp copyPopup  # src/popup/*.html         -> dist/popup
npx gulp zip        # dist/**/* -> release.zip

npx gulp            # default: watch mode (recompile-on-change is NOT included; runs the copy/minify tasks on file changes)
```

**After editing any `src/` file you must recompile and re-bundle, or `dist/` (the actual extension) will be stale.** For a `src/scripts/*.ts` change the minimal sequence is `npx tsc -p tsconfig.json && npx gulp js`. Commits should include both the `src/` change and the regenerated `dist/` output (see git history).

There are no tests, linter, or CI.

## Loading / testing

Load `dist/` as an unpacked extension at `chrome://extensions` (Developer mode → Load unpacked). Reload the extension there after rebuilding to pick up changes. Verification is manual in-browser: right-click an image on x.com and check the download path and the generated `profile.json`.

## Architecture

Three independent entry points, no shared modules or bundler — each `.ts` file compiles to a standalone script.

- **`src/scripts/content.ts`** (content script, injected on x.com / twitter.com). On every `contextmenu` (right-click) it scrapes the username + display name from the DOM and caches them in module-level `last*` variables. It answers the service worker's `GET_USERNAME` message with that cache. Three distinct DOM contexts are handled, each with different markup: a post (`article[data-testid="tweet"]`), the media grid (`[data-testid="cellInnerDiv"]`), and the fullscreen photo lightbox (URL `…/status/…/photo/N`). `displayNameExpected` signals "we know which user, so a missing display name is a real failure" vs. contexts where no name is available.

- **`src/scripts/event.ts`** (service worker / background). Registers the context menu (`targetUrlPatterns: *://pbs.twimg.com/media/*`). On click, `callDownload` rewrites the image URL to fetch original size: sets `name=orig`, and for timeline thumbnails (`format=webp`) swaps to `jpg`, falling back to `png` if the JPG HEAD/GET fails. Downloads to `x-img/<username>/`. Then `saveProfile` maintains `chrome.storage.local` keyed by username — value is `{ displayName, history: [{name, since}] }`, prepending a new history entry only when the display name changed — and `downloadProfileJson` writes/overwrites the per-user `profile.json` sidecar. Also handles popup messages: `EXPORT_STORAGE`, `IMPORT_STORAGE`, `REBUILD_PROFILES` (all use `return true` for async `sendResponse`).

- **`src/popup/popup.ts`** + `popup.html` (browser action popup). Export/import the entire `chrome.storage.local` as a JSON backup file, and trigger `REBUILD_PROFILES` to regenerate all `profile.json` sidecars from storage.

### Key coupling / fragility

- **The scraping in `content.ts` depends on X's `data-testid` DOM structure and breaks whenever X changes its markup.** This is the most common source of bugs. When the username can't be resolved it downloads under `_unknown` and fires a notification; a missing-but-expected display name also notifies.
- X renders emoji in display names as `<img alt="…">` (twemoji), which `textContent` drops. The `extractName()` helper in `content.ts` walks child nodes and concatenates `img.alt` — use it (not `textContent`) for any new name extraction.
- Storage is keyed by username with no namespacing; `profile.json` is downloaded via a `data:` URL with `conflictAction: 'overwrite'`.

## Conventions

- **チャットでの応答は日本語で行う。**
- Tabs for indentation. Comments and user-facing strings are in Japanese; commit messages follow `Prefix: 日本語の説明` (e.g. `Fix:`, `Add:`).
