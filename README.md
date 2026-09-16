# My Website Blocker

A tiny personal Chrome extension for blocking websites. Not published — loaded locally as an unpacked extension.

## Install

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** and select this folder.
4. (Optional) Click the puzzle-piece icon in the toolbar and pin **My Website Blocker**.

## Use

- Click the extension icon, type a domain (e.g. `youtube.com`), and press **Block**.
- The domain and all its subdomains are blocked; visiting them shows a "This site is blocked" page.
- Click ✕ next to a domain in the popup to unblock it.

Pasting a full URL like `https://www.twitter.com/home` also works — it gets normalized to `twitter.com`.

## How it works

- `manifest.json` — Manifest V3, uses the `declarativeNetRequest` API (no background script needed; Chrome enforces the rules itself).
- `popup.html` / `popup.js` — the UI; stores the list in `chrome.storage.local` and syncs it to dynamic blocking rules.
- `blocked.html` — the page shown instead of a blocked site.
