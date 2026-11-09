# Iron Ledger

A personal lifting journal inspired by the compact navigation, dark navy cards and appearance controls of [ACOP](https://acop-database.netlify.app/). Opens directly into the app. React + Vite, with Supabase Auth and Postgres for optional private cloud persistence. No programs, coaching, social features or subscriptions.

## Run locally

Requires Node 22.12+ (Node 24 recommended).

```sh
npm ci
cp .env.example .env
# Fill in the two public Supabase values when a backend is ready.
npm run dev
```

Open the Local URL printed by Vite. Without environment values, the app works in explicitly labeled **local-only** mode. Local history is stored only in that browser's localStorage; clearing browser data removes it. Export JSON backups regularly.

```sh
npm test          # model, storage/retry/conflict and real SQL checks in embedded Postgres
npm run build    # production assets in dist/
npm run preview  # serve the production build locally
```

No external server is needed for the frontend. Local preview uses port 5173 by default. Routes use URL hashes, so direct navigation works on static hosts. Netlify also includes a catch-all rewrite for nested URL refreshes.

## What works

- Empty personal workspace, editable exercise library, and a completely separate demo workspace with 48 sample sessions across several months. Demo mode is remembered for the current browser tab; no sample workouts are inserted into an account.
- Any number of workouts per date; local calendar dates; names, notes, custom exercises created inline; ordered exercises and sets; decimal loads, reps, RPE, warm-up labels, completed checkboxes, set notes, duplication and repetition. Finish requires a completed set. Copying a workout resets completion and creates new identifiers.
- Local autosave, draft recovery, saved/syncing/failed states and retry. Signed-in cloud workspaces have a separate per-user local recovery cache. Signing in never silently merges local or demo records.
- Exercise renaming, favorites, archives, notes, past sessions, records and configurable exercise-detail graphs. Stable IDs preserve history. Equipment/load type is locked after an exercise has been logged, to prevent historical data from changing meaning; create a separate variation instead.
- Searchable and filterable list/calendar history; edit old sets and see graphs/records change immediately; workout deletion with confirmation.
- Multiple independently configured graph cards; selectable exercise, metric, range, load for rep comparisons and color; custom dates; keyboard/touch point inspection and source workouts; expanded views, data tables, hide/restore/remove, and up/down ordering.
- Customizable dashboard sections, with show/hide, up/down ordering and reset. Graph cards are independently ordered. No drag dependency is needed.
- Dark, light and system themes, six accent colors, display units and sidebar state. Keyboard focus states, native modal focus containment, phone drawer and a reduced-motion preference.
- Complete JSON export/validated restore preview, a pre-restore backup download, and all-set CSV export. Restore **replaces** the selected workspace rather than merging it. CSV cells that begin with formula characters are neutralized.

## Configure private cloud storage

No cloud project was changed during development. The connected account's only project was inactive, and no lifting database destination was selected. Use a dedicated Supabase project, or deliberately select an existing project after checking its contents.

1. Create or select an **active** Supabase project.
2. Open its SQL Editor and run [`database/schema.sql`](database/schema.sql). It is transactional and can be reapplied. This is a schema setup script, not a fabricated CLI migration history entry. If your project uses migrations, create a migration with your installed CLI's documented commands and use this SQL as its contents.
3. Enable the Data API for the public schema. In current Supabase setups this is normally enabled by default; verify it in project settings. The script explicitly grants authenticated SELECT, enables RLS, and restricts writes to the ownership-checked save function.
4. In Authentication, enable Email sign-in. Set Site URL to your eventual Netlify HTTPS URL. Add both that URL and your local development origin (for example `http://127.0.0.1:5173`) to allowed redirect URLs. Configure production SMTP for reliable sign-in email delivery. A custom mail provider can require its own credentials and setup.
5. From the project's API settings copy the **project URL** and **publishable key** into `.env`:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   ```

   The publishable key is designed for browser use. **Never put a service-role/secret key in a VITE_ variable.** RLS and the save RPC enforce ownership; the key is not the authorization boundary.
6. Restart Vite (or rebuild the Netlify deployment). Use **Connect cloud**, enter your email, and open the emailed link. The first account workspace has zero workouts. Add a workout and wait for **Cloud synced** before switching devices.
7. Sign in on your phone with the same email. Verify that the workout and preferences appear. Edits sync after a short debounce; clean workspaces refresh on focus and every 30 seconds. With concurrent edits, the app stops and asks you to export the local copy and load the cloud version; it does not silently overwrite a newer cloud revision.

### Storage design and security

One `lifting_workspaces` row per auth user contains a versioned JSON document with exercises, workouts/sets, graphs and preferences. It keeps a personal workspace transactionally consistent: historical edits, deletions, layout and imports are one atomic write. The user ID is the primary-key index; SELECT is restricted by `auth.uid() = user_id`. Unauthenticated clients have no table access.

Direct writes are revoked from both client roles. `save_lifting_workspace` uses `SECURITY DEFINER` only to provide a controlled write path: it has an empty search path, checks `auth.uid()`, accepts no user ID argument, and writes only that user's row. Execute is revoked from PUBLIC and anon. It locks the row, checks the expected revision and records a unique request ID. Retrying a lost response with the same ID does not duplicate a save. A stale device gets `VERSION_CONFLICT` rather than overwriting another device.

The frontend validates complete backups, including identifiers, exercise references, dates, numeric bounds and preferences. The RPC validates document shape and size; ownership is always enforced on the server. This is personal data, not a public shared document. Do not include records in Git, `.env.example`, build assets or fixtures. Tests use generated sample data only.

The workspace is capped at 30 MB at the server/import boundary. Browser localStorage usually has a much smaller browser-specific quota, so very large histories can lose **local recovery capacity**, which produces a visible save error while cloud persistence remains available. The full document sync keeps implementation and recovery simple for a personal journal. If a large history approaches browser quota, migrate recovery storage to IndexedDB and cloud storage to per-workout rows rather than raising the cap. The app is not an installable offline PWA: an already open tab can retain edits offline, but reopening the whole site without a network is not guaranteed.

On sign-out, the account's recovery cache stays on that browser so interrupted drafts can be recovered when the same account signs in again. Use a trusted personal browser. No local/demo data is automatically uploaded on sign-in. To transfer a local workspace to your account, explicitly export local JSON, sign in, and preview/restore it from Settings.

## Netlify and GitHub

The application is published on the `iron-ledger` branch of `jakejackson1001/Point-Simulation`. This branch contains the lifting app at its root; the repository’s `main` branch retains the existing project. ACOP was not modified or deployed over.

1. Use the `iron-ledger` branch of `jakejackson1001/Point-Simulation`, or copy it to a dedicated repository. Do not use ACOP-DATABASE as the destination.
2. From this directory, add its remote and push:

   ```sh
   git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_LIFTING_REPO.git
   git push -u origin main
   ```

3. In Netlify, **Add new project → Import an existing project → GitHub**, choose `Point-Simulation` and set the production branch to `iron-ledger` in a **new Netlify project**, then use:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node: 24 (already set in `netlify.toml`)
4. Add the two `VITE_SUPABASE_*` environment variables in Netlify before building. These values are compiled into the frontend; changing them requires a rebuild.
5. Deploy as a **new** Netlify project, then set the Supabase Site URL/redirect URLs to its address. Do not choose the existing ACOP Netlify site.
6. Run the hosted acceptance checks below with your real configured account. Keep its history empty until you deliberately begin logging; never import demo JSON into it unless that is your intent.

## Metric definitions

All progress metrics use finished workouts and completed working sets by default; warm-ups and incomplete sets are excluded. Missing sessions are omitted, not plotted as zero. Points are positioned by actual local dates. Weekly aggregation starts Monday; empty weeks are omitted. More than one workout on a day remains separate in session metrics (use the data table if points overlap).

| Metric | Meaning |
| --- | --- |
| Heaviest working set | Highest logged load for that exercise in the session. Added-load exercises show **added** weight, assistance shows **assistance**, never total body mass. Not offered for plain bodyweight. |
| Best reps at weight | Most reps at the selected canonical load, with a 0.01 kg tolerance. Bodyweight uses all qualifying sets. |
| Working-set volume | Sum of load × reps. External-load exercises only. Dumbbell weight is **per dumbbell**, not doubled. |
| Sets per session/week | Count of completed working sets. |
| Estimated 1RM | Epley: load × (1 + reps/30), using 1–10 reps; a one-rep set uses actual load. External-load exercises only; always labeled an estimate. |
| Workout frequency | Number of finished workouts per local Monday-based week, independent of exercise selection. |

Weights are stored canonically as kilograms. Display conversion does not change stored history. Graph values are rounded to two decimal places for presentation; set inputs show two decimal places after conversion. Bodyweight, weighted bodyweight and assisted exercises deliberately do not get volume or estimated 1RM because body mass/effective load is not collected. Personal records show highest external/added load, lowest assistance or highest bodyweight reps, with the convention labeled.

## Verification

See [`VERIFICATION.md`](VERIFICATION.md) for checks actually performed and the remaining hosted acceptance check. `npm test` includes embedded Postgres SQL execution with simulated Supabase roles/`auth.uid()`, rather than only checking SQL text. That still does not verify hosted Supabase Auth, email delivery, its Data API configuration, or physical cross-device behavior.

Recommended hosted acceptance: sign in on two devices; create one exercise and workout on device A; finish it and wait for Cloud synced; reopen on device B; edit an old set and confirm its graph changes; test a disconnected/reconnected save; test a concurrent edit conflict; export and restore a backup; verify a second account cannot see the first account's data; then start using your real history.
