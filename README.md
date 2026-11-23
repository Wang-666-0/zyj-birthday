# ZYJ birthday page

A static orange-cat birthday greeting. No build step or external CDN is needed.

Publish with GitHub Pages from the `main` branch and `/(root)` folder. `.nojekyll` keeps these files unchanged. All local asset paths are relative, so a project-site URL works.

Edit `content.json` for the recipient, greeting, letter and photos. An empty photo list hides the photo section.

The birthday draw has ten slips in total: nine good-luck messages and the final letter. Each round draws four different random messages, then reveals the letter with the `-WSW` signature. The two personal wishes are part of the random pool.

`music.js` synthesises a gentle birthday melody locally using Web Audio. It starts only after a user gesture, supports play/pause, and pauses when the page is hidden. No audio file, remote music service, account or API key is needed.

The active address remains https://wang-666-0.github.io/zyj-birthday/ so the existing PCB QR continues to work.
