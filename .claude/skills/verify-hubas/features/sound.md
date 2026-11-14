# Hear the season

The selected town's soil-water series can be heard as short tones while the slider plays. Sound starts off. Wetter readings have a higher pitch and drier readings a lower pitch. Missing readings are silent.

## Sub-features

- `sound-toggle` opts into audio with Hear the season; the same button mutes it.
- `season-playback` starts at the first window when sound is enabled and follows the shared Play/Pause slider.
- `sound-gaps` leaves null readings silent and explains missing data.
- `sound-lifecycle` turns audio off when switching towns and stops playback when the page is hidden.

## How to get to it (user POV)

- Select a town in the Town dropdown or on the map.
- Click Hear the season. The sound state changes to on and the slider begins at the first window.
- Click Pause to hold the date; Play continues, or restarts from the first window at the end.
- Click Hear the season again to turn sound off. Changing towns also turns it off.

## Driving it with control-hubas

- Start the static export with `node scripts/control-hubas.mjs up` and run `doctor`.
- Open a town with `drive --town 0702211000 --name sound-start`; check the panel says Sound off.
- Run `npx playwright test e2e/sound.spec.ts --workers=1` for desktop/phone opt-in, shared playback, end stop, keyboard control, missing readings, town changes and startup failure. Screenshots, traces and video are in test-results.
- The same spec renders the production tone function through OfflineAudioContext and checks pitch, silence and the end of each tone. It uses actual Web Audio, without substituting fake oscillators.

## Gotchas

- The town data on current main contains no soil-water readings. Silence is correct; it must not be described as measured dryness.
- One second represents one window. The pitch mapping is an explanatory choice over the map's 0.10–0.45 scale, not a scientific alarm or forecast.
- Audio requires a user click. Browser/device sound settings can still mute the output; a browser startup failure is shown without disabling the slider.
- Backgrounding the page pauses playback. Returning does not start it automatically.
