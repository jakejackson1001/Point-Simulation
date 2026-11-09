# Verification record

Verified locally on November 9, 2026. All browser-created QA workouts/exercises were confined to the separate demo workspace; it was then restored to clean sample data. The personal workspace remains empty.

## Automated checks

`npm test` passes 17 tests:

- Display unit conversion preserves canonical historical load.
- Metrics omit warm-ups, incomplete sets and unfinished workouts.
- Historical edits, renames and archives preserve/update progression and records.
- Repeating workouts resets completion and creates fresh identifiers.
- Bodyweight, weighted bodyweight and assistance do not produce misleading volume/e1RM.
- Epley estimates accept only 1–10 reps; one rep uses actual load.
- Multiple same-day workouts remain separate; weekly counts aggregate correctly.
- Full JSON backup round-trip and validation for bad numbers/references/duplicate IDs/dates.
- CSV escaping, multiline notes and formula neutralization.
- Local recovery and separate demo/personal/account caches.
- Cloud lost-response retries reuse request IDs without duplicate saves.
- Concurrent devices receive a version conflict rather than silent overwrite.
- Clean cloud refresh and preservation of corrupt browser cache.
- Actual SQL execution in embedded Postgres (PGlite), with simulated Supabase auth roles: owner-only SELECT, no anonymous reads or function calls, no direct authenticated UPDATE, atomic revision checking, and idempotent saves.

`npm run build` passes. `npm audit --omit=dev` reports zero known production dependency vulnerabilities at verification time.

## Browser checks performed

- Inspected the ACOP reference in the browser before designing.
- Created “QA tempo press” in demo and logged a named workout with that exercise and back squat, two completed sets each, including decimal load.
- Refreshed the page and reopened the unfinished draft with all entered values/completion state recovered.
- Finished the workout, searched for it in history, and found the completed entry.
- Added a heaviest-set graph for the custom exercise and inspected its accessible table.
- Opened its source workout and changed a historical set from 135.5 lb to 145.5 lb. The graph/table immediately showed 145.5 lb.
- Moved, hid, restored and removed that graph. Workout data remained present.
- Changed accent to teal and units to kg, reloaded, and verified both persisted.
- Exported JSON through the UI, selected that downloaded file, reviewed the 49-workout/9-exercise/2-graph preview, and restored it. The existing workspace backup downloaded before replacement.
- Exported all sets as CSV through the UI.
- At a 390 × 844 viewport, used the mobile drawer, repeated a previous workout as a new draft (all checkboxes reset), entered a 67.5 kg set, and completed it. Inputs were 44 px tall. No page overflow: content width 375 px within the 390 px viewport (scrollbar uses remaining space).
- Visually checked mobile dark dashboard, mobile logger and light appearance settings.
- Hid/reordered dashboard sections, reloaded to verify the hidden state, then reset the layout.
- Used calendar history to select November 8 and confirmed only that day's workout appeared.
- Restored the clean 48-session demo after QA.
- Browser error/warning log was empty when inspected.
- Served the production build with `npm run preview`, verified it opened with zero personal workouts, then opened its separate demo and expanded/closed a graph successfully.

## Not verified / remaining external setup

No active lifting Supabase project was selected. The source is now published on the `iron-ledger` branch of `jakejackson1001/Point-Simulation`; its existing main branch is unchanged. The account's only connected Supabase project was inactive, and it was not changed. Supabase Auth/email delivery, hosted Data API access, real phone-to-computer sync and deployed Netlify behavior are therefore **not verified**. Mock storage tests and embedded SQL checks do not establish that hosted sync works.

Follow README.md to run the schema, add the project URL/publishable key, configure Auth redirects and production email delivery, use the `iron-ledger` branch and deploy a new Netlify project. Then run the hosted acceptance flow documented there. ACOP's repository and hosting were not altered.

## Copy update

Removed motivational and promotional copy throughout the app, replacing it with functional labels and descriptions. All 17 tests and the production build passed again after the update.
