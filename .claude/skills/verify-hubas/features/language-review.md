# Language review

A build with NEXT_PUBLIC_CEBUANO_REVIEW=1 exposes an explicitly unapproved English/Cebuano draft switch. Default production builds remain English with no switch. This is a speaker-review handoff, not a published translation.

## Sub-features

- Language selection persists across page navigation and reload through browser storage.
- The page lang changes to ceb; Method's main content remains lang=en.
- Opening/finding draft sentences, legend, timeline and town labels are in the review table.

## How to get to it (user POV)

- Open a local/review build made with NEXT_PUBLIC_CEBUANO_REVIEW=1.
- Choose Cebuano draft in the top-bar Language control. Check the labelled draft sentences and ordinary controls.
- Navigate to Dam/Rice/Method and reload. Change back to English.

## Driving it with control-hubas

- Run language-review.spec.ts with NEXT_PUBLIC_CEBUANO_REVIEW=1. PROOF=1 writes English and Cebuano screenshots.
- A normal production build deliberately skips that opt-in review spec and has no selector.
- Compare every English/Cebuano row in docs/sc-482-cebuano-review.md with a named speaker.

## Gotchas

- Do not merge/enable the translations until speaker approval and reconciliation with final sc-553/sc-456 English are recorded in Shortcut.
- No speaker approval is claimed. Method stays in English.
