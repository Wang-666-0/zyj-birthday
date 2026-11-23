# ZYJ birthday page

A static orange-cat birthday greeting. No build step or external CDN is needed.

Publish with GitHub Pages from the `main` branch and `/(root)` folder. `.nojekyll` keeps these files unchanged. All local asset paths are relative, so a project-site URL works.

Edit `content.json` for the recipient, greeting, letter and photos. An empty photo list hides the photo section.

The birthday draw has ten slips in total: nine good-luck messages and the final letter. Each round draws four different random messages, then reveals the letter with the `-WSW` signature. The two personal wishes are part of the random pool.

`music.js` synthesises a gentle birthday melody locally using Web Audio. It starts only after a user gesture, supports play/pause, and pauses when the page is hidden. No audio file, remote music service, account or API key is needed.

The active address remains https://wang-666-0.github.io/zyj-birthday/ so the existing PCB QR continues to work.

The opening uses one full-screen scene at a time: make a wish and extinguish the candle, then drag the paw along the dashed seam to tear the gift open. Partial tears can continue, the gift gently follows the drag, and the wrapping separates to reveal the fortune section underneath without another confirmation button. Keyboard controls are also supported.

The candle has a tap target. Optional microphone sensing asks permission only after its own button is clicked, processes volume locally without recording or uploading, and releases tracks on completion, timeout or page exit. Its physical microphone behaviour still needs checking on the recipient's phone. Music begins at the completing tear gesture, when its controls become available on the greeting page.

Microphone startup now creates/resumes its audio context in the click gesture, then waits for permission. A volume meter and explicit status distinguish unsupported clients, permission errors, startup retries and live input. Listening has a separate 12-second timeout; immediate or quieter input is not discarded as calibration noise. Synthetic input and lifecycle scenarios are tested, while real-device WeChat microphone compatibility remains device-dependent and must be checked on the phone.

The entrance first asks the visitor to make a wish. Only the explicit wish-confirmation button requests microphone access; tapping the cake is enabled as a fallback after this confirmation. Scene transitions are deliberately unhurried: 1.8 seconds from extinguishing to the gift, 1.8 seconds to reveal fortunes after tearing, and about 1 second for each draw. Drag feedback and microphone response remain immediate. Reduced-motion preferences retain short transitions.
