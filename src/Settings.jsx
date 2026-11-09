import React, { useState } from "react";
import {
  Download,
  Upload,
  Cloud,
  Mail,
  LogOut,
  Check,
  Monitor,
  Sun,
  Moon,
} from "lucide-react";
import { supabase } from "./storage.js";
import { validate, csv, today } from "./model.js";
import { Button, Field, Modal, download, Confirm } from "./ui.jsx";
export const accents = [
  ["Lime", "#a8d878"],
  ["Teal", "#66d7cd"],
  ["Blue", "#8bb9ff"],
  ["Violet", "#b6a1ff"],
  ["Orange", "#ffb36c"],
  ["Coral", "#ff9c9c"],
];
export function Account({ session, mode, onDemo, notify }) {
  const [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <div className="card settings-card">
      <div className="card-top">
        <div className="actions">
          <Cloud size={21} />
          <h3>Private cloud account</h3>
        </div>
        <span className="pill">
          {session
            ? "Connected"
            : supabase
              ? "Ready to connect"
              : "Setup required"}
        </span>
      </div>
      {session ? (
        <>
          <p>
            Signed in as <strong>{session.user.email}</strong>.{" "}
            {mode === "demo"
              ? "Demo records stay separate from your account."
              : "Your account history syncs through Supabase."}
          </p>
          <Button
            icon={LogOut}
            onClick={async () => {
              const { error } = await supabase.auth.signOut();
              if (error) notify(error.message);
            }}
          >
            Sign out
          </Button>
        </>
      ) : (
        <>
          <p className="muted">
            Access the same personal history from your phone and computer. Local
            and demo records are separate; signing in never uploads them
            automatically.
          </p>
          {!supabase ? (
            <div className="notice">
              Cloud connection hasn’t been configured for this app yet. Your
              local data is saved on this browser only. You can explore the
              separate demo while setup is completed.
            </div>
          ) : (
            <form
              onSubmit={async (ev) => {
                ev.preventDefault();
                setBusy(true);
                const { error } = await supabase.auth.signInWithOtp({
                  email,
                  options: { emailRedirectTo: window.location.origin },
                });
                setMessage(
                  error
                    ? error.message
                    : "Check your email for a sign-in link. Open it on this device to finish signing in.",
                );
                setBusy(false);
              }}
            >
              <div className="inline-form">
                <Field
                  label="Email address"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                />
                <Button
                  type="submit"
                  className="primary"
                  icon={Mail}
                  disabled={busy}
                >
                  {busy ? "Sending…" : "Email sign-in link"}
                </Button>
              </div>
              <p role="status">{message}</p>
            </form>
          )}
        </>
      )}
      <div className="account-demo">
        <span className="muted">
          Explore several months of sample progression.
        </span>
        <Button onClick={onDemo}>
          {mode === "demo" ? "Leave demo" : "Open separate demo"}
        </Button>
      </div>
    </div>
  );
}
export default function Settings({
  state,
  update,
  session,
  mode,
  onDemo,
  notify,
  store,
}) {
  const [preview, setPreview] = useState(null),
    [error, setError] = useState(""),
    [reset, setReset] = useState(false);
  const pref = (patch) =>
    update((s) => ({ ...s, prefs: { ...s.prefs, ...patch } }));
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Settings</h2>
          <p>Appearance, units, account, and backups.</p>
        </div>
      </div>
      <div className="settings-grid">
        <div className="card settings-card">
          <span className="eyebrow">PERSONALIZE</span>
          <h3>Appearance</h3>
          <p className="muted">Choose a theme and accent color.</p>
          <Field label="Theme">
            <div className="theme-options">
              {[
                ["light", "Light", Sun],
                ["dark", "Dark", Moon],
                ["system", "System", Monitor],
              ].map(([v, label, Icon]) => (
                <button
                  key={v}
                  aria-pressed={state.prefs.theme === v}
                  onClick={() => pref({ theme: v })}
                >
                  <Icon size={20} />
                  {label}
                  {state.prefs.theme === v && <Check size={14} />}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Accent color">
            <div className="swatches">
              {accents.map(([name, color]) => (
                <button
                  title={name}
                  aria-label={`${name} accent`}
                  aria-pressed={state.prefs.accent === color}
                  key={color}
                  style={{ background: color }}
                  onClick={() => pref({ accent: color })}
                >
                  {state.prefs.accent === color && <Check size={18} />}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Preferred weight unit">
            <select
              value={state.prefs.unit}
              onChange={(ev) => pref({ unit: ev.target.value })}
            >
              <option value="lb">Pounds (lb)</option>
              <option value="kg">Kilograms (kg)</option>
            </select>
          </Field>
          <p className="hint">
            Weights are stored in kilograms. Switching display units converts
            values without reinterpreting your history.
          </p>
        </div>
        <div className="card settings-card">
          <span className="eyebrow">BACKUP & PORTABILITY</span>
          <h3>Export and restore data</h3>
          <p className="muted">
            JSON contains your complete workspace, including unfinished workouts
            and preferences. CSV contains every workout set.
          </p>
          <div className="stack">
            <Button
              icon={Download}
              onClick={() =>
                download(
                  `iron-ledger-${mode}-${today()}.json`,
                  JSON.stringify(state, null, 2),
                  "application/json",
                )
              }
            >
              Export complete JSON backup
            </Button>
            <Button
              icon={Download}
              onClick={() =>
                download(
                  `iron-ledger-sets-${today()}.csv`,
                  csv(state),
                  "text/csv",
                )
              }
            >
              Export sets as CSV
            </Button>
            <label className="button upload">
              <Upload size={17} />
              Preview a JSON restore
              <input
                type="file"
                accept=".json,application/json"
                onChange={async (ev) => {
                  const file = ev.target.files[0];
                  if (!file) return;
                  try {
                    if (file.size > 30 * 1024 * 1024)
                      throw Error("Backup exceeds 30 MB.");
                    const parsed = validate(JSON.parse(await file.text()));
                    setPreview(parsed);
                    setError("");
                  } catch (e) {
                    setError(e.message);
                  }
                  ev.target.value = "";
                }}
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <p className="hint">
            Restore replaces only the currently selected{" "}
            {mode === "demo"
              ? "demo workspace"
              : mode === "cloud"
                ? "signed-in account"
                : "local workspace"}
            . You review it before applying, and a backup of the current
            workspace downloads first.
          </p>
        </div>
      </div>
      <Account {...{ session, mode, onDemo, notify }} />
      <div className="card settings-card">
        <h3>Dashboard layout</h3>
        <p className="muted">
          Show, hide, and reorder sections using Customize on your dashboard.
        </p>
        <Button onClick={() => setReset(true)}>Reset dashboard layout</Button>
      </div>
      {preview && (
        <Modal
          title="Review backup before restoring"
          onClose={() => setPreview(null)}
        >
          <div className="import-stats">
            <strong>
              {preview.workouts.length}
              <small>Workouts</small>
            </strong>
            <strong>
              {preview.exercises.length}
              <small>Exercises</small>
            </strong>
            <strong>
              {preview.graphs.length}
              <small>Graphs</small>
            </strong>
          </div>
          <p className="muted">
            Date range:{" "}
            {preview.workouts.map((w) => w.date).sort()[0] || "No workouts"} →{" "}
            {preview.workouts
              .map((w) => w.date)
              .sort()
              .at(-1) || "—"}
          </p>
          <div className="notice">
            This will replace the current {mode} workspace. A JSON backup of the
            current data will download before replacement. Demo data only
            becomes account data if you explicitly restore a demo export into
            your account.
          </div>
          <div className="actions end">
            <Button onClick={() => setPreview(null)}>Cancel</Button>
            <Button
              className="primary"
              onClick={() => {
                download(
                  `iron-ledger-before-restore-${today()}.json`,
                  JSON.stringify(state, null, 2),
                  "application/json",
                );
                update(preview);
                setPreview(null);
                notify("Backup restored into the selected workspace.");
              }}
            >
              Back up current & restore
            </Button>
          </div>
        </Modal>
      )}
      {reset && (
        <Confirm
          title="Reset dashboard layout?"
          onClose={() => setReset(false)}
          onConfirm={() =>
            pref({
              layout: ["activity", "graphs", "recent", "records"],
              hidden: [],
            })
          }
        >
          Your graphs and workout data stay intact.
        </Confirm>
      )}
    </>
  );
}
