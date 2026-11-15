# Hear the season

Sound starts off. The map timeline has a sound button and volume control before a town is selected. The low voice follows the mean soil water; the high voice follows the selected town. Dam and rice timelines use the same pentatonic bell instrument, with soft high rain notes. Missing readings are rests.

## Sub-features

- Opt-in sound and volume live in each of the map, dam and rice timelines.
- Two octaves of a pentatonic scale keep wetter/higher values higher in pitch.
- Three sine partials, a soft decay and a short echo form the instrument.
- A look-ahead queue schedules oscillator start times on AudioContext.currentTime. Pause/mute cancels queued notes; speed and loop reschedule on the audio clock.
- Browser audio errors leave visual controls usable.

## How to get to it (user POV)

- On Soil water, Dam or Rice, click Hear the season. Playback starts at the first frame.
- Adjust Sound volume. Select a town for the higher soil voice. Click the sound button again to mute.
- Use Pause, speed and Loop as on the silent timeline.

## Driving it with control-hubas

- Use up and doctor, then drive each page. Use Playwright MCP for the sound button and volume input.
- Run sound.spec.ts for scale/rest checks, opt-in controls on all three views, missing-data silence, an OfflineAudioContext listening sample and browser-start failure.
- PROOF=1 writes docs/proof/sc-499-listening-sample.wav with an AI-assistance metadata comment. It uses the true regional mean plus Bogo as the selected town.

## Gotchas

- Two non-team listeners must still supply named feedback on pleasantness and hearing the seasonal change before sc-499 is accepted. No subjective listening approval is claimed.
- Playwright video has no sound track; use the WAV as the audio proof. It is synthesized by the production instrument, not a recording of a physical laptop speaker.
- The Score page retains its three existing voice controls and now imports the shared replacement instrument.
