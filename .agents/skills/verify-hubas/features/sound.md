# Hear the season

Sound and loop start on. The map timeline has a sound button and volume control before a town is selected. The low voice follows the mean soil water; the high voice follows the selected town. Dam and rice timelines use the same pentatonic bell instrument, with soft high rain notes. Missing readings are rests.

## Sub-features

- Sound, loop and volume live in each of the map, dam and rice timelines. Sound and loop start on.
- Two octaves of a pentatonic scale keep wetter/higher values higher in pitch.
- Three sine partials, a soft decay and a short echo form the instrument.
- Each step the timeline shows plays its own note, so a slider jump, a dam frame that waits for its image, or a loop never leaves the sound on another step. A step that follows the last one on time is placed on the audio-clock beat (`AudioContext.currentTime`), so timer jitter does not reach the rhythm. Pause/mute cancels pending notes.
- The Score page keeps its voice timbres: `playTone` uses `wave` (sine soil, triangle dam and rice).
- Browser audio errors leave visual controls usable.

## How to get to it (user POV)

- On Soil water, Dam or Rice, press Play to start the season with sound and loop on.
- Adjust Sound volume. Select a town for the higher soil voice. Click Hear the season to mute or turn sound back on.
- Use Pause, speed and Loop as on the silent timeline.

## Driving it with control-hubas

- Use up and doctor, then drive each page. Use Playwright MCP for the sound button and volume input.
- Run sound.spec.ts for scale/rest checks, opt-in controls on all three views, missing-data silence, an OfflineAudioContext listening sample and browser-start failure.
- PROOF=1 writes docs/proof/sc-499-listening-sample.wav with an AI-assistance metadata comment. It uses the true regional mean plus Bogo as the selected town.

## Gotchas

- The notes follow the steps on screen. On a busy machine the timeline steps run late, and the notes with them; `sound.spec.ts` checks the median beat and that each low note matches the window shown, also after a slider jump.

- Two non-team listeners must still supply named feedback on pleasantness and hearing the seasonal change before sc-499 is accepted. No subjective listening approval is claimed.
- Playwright video has no sound track; use the WAV as the audio proof. It is synthesized by the production instrument, not a recording of a physical laptop speaker.
- The Score page retains its three existing voice controls and now imports the shared replacement instrument.
