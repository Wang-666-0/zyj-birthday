# ZYJ birthday page

A static orange-cat birthday greeting. No build step or external CDN is needed.

Publish with GitHub Pages from the `main` branch and `/(root)` folder. `.nojekyll` keeps these files unchanged. All local asset paths are relative, so a project-site URL works.

Edit `content.json` for the recipient, greeting, letter and photos. An empty photo list hides the photo section.

The birthday draw has ten slips in total: nine good-luck messages and the final letter. Each round draws four different random messages, then reveals the letter with the `-WSW` signature. The two personal wishes are part of the random pool.

`music.js` synthesises a birthday melody locally using Web Audio. Its normal master gain is .64, twice the previous .32. Music is enabled by default and attempts to play immediately on entry, with readiness retries on WeixinJSBridgeReady and page restoration. Browsers that block audible autoplay show an enable-sound control and start on the first touch, click or activation key instead; pending autoplay cannot block this gesture retry. Actual playback state is shown only once the audio context runs. The same melody continues through the candle, gift and fortune scenes. A small play/pause control remains available throughout; an explicit pause is respected by every automatic retry. Music pauses when the page is hidden. No audio file, remote music service, account or API key is needed. Zero-touch playback remains subject to each browser or WeChat WebView's policy.

The active address remains https://wang-666-0.github.io/zyj-birthday/ so the existing PCB QR continues to work.

The opening uses one full-screen scene at a time: make a wish and extinguish the candle, then drag the paw along the dashed seam to tear the gift open. Partial tears can continue, the gift gently follows the drag, and the wrapping separates to reveal the fortune section underneath without another confirmation button. Keyboard controls are also supported.

The candle has a tap target. Optional microphone sensing asks permission only after its own button is clicked, processes volume locally without recording or uploading, and releases tracks on completion, timeout or page exit. Music keeps its position while microphone sensing lowers its gain to .018 over .12 seconds; every capture exit restores normal gain over .9 seconds without restarting playback or overriding an explicit pause. This reduces speaker interference alongside echo cancellation. The combined louder-music and microphone behaviour still needs checking on the recipient's phone.

Microphone startup now creates/resumes its audio context in the click gesture, then waits for permission. A volume meter and explicit status distinguish unsupported clients, permission errors, startup retries and live input. Listening has a separate 12-second timeout; immediate or quieter input is not discarded as calibration noise. Synthetic input and lifecycle scenarios are tested, while real-device WeChat microphone compatibility remains device-dependent and must be checked on the phone.

The entrance first asks the visitor to make a wish. Only the explicit wish-confirmation button requests microphone access; tapping the cake is enabled as a fallback after this confirmation. Scene transitions are deliberately unhurried: 1.8 seconds from extinguishing to the gift, 2.4 seconds to reveal fortunes after tearing, and about 1 second for each draw. Drag feedback and microphone response remain immediate. Reduced-motion preferences retain short transitions.
