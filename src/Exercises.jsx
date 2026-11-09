import React, { useState } from "react";
import { Plus, Star, Archive, Search, Pencil, Dumbbell } from "lucide-react";
import {
  TYPES,
  id,
  convention,
  records,
  dateLabel,
  number,
  load,
} from "./model.js";
import { Button, IconButton, Field, Modal, Empty } from "./ui.jsx";
import { GraphCard, newGraph } from "./Graph.jsx";
export function ExerciseForm({
  exercise,
  onSave,
  onClose,
  initialName = "",
  locked = false,
}) {
  const [d, setD] = useState(
    exercise || {
      id: id(),
      name: initialName,
      type: "barbell",
      tags: "",
      notes: "",
      favorite: false,
      archived: false,
    },
  );
  return (
    <Modal
      title={exercise ? "Edit exercise" : "Create an exercise"}
      onClose={onClose}
    >
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          onSave({ ...d, name: d.name.trim() });
          onClose();
        }}
      >
        <Field
          label="Exercise name"
          required
          maxLength={200}
          autoFocus
          value={d.name}
          onChange={(ev) => setD({ ...d, name: ev.target.value })}
        />
        <Field label="Equipment / load type">
          <select
            value={d.type}
            disabled={locked}
            onChange={(ev) => setD({ ...d, type: ev.target.value })}
          >
            {Object.entries(TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <p className="hint">
          {convention(d)}.{" "}
          {locked
            ? "Load type is locked once logged to preserve historical meaning. Create a separate variation for a different type."
            : "Use a separate exercise for each variation."}
        </p>
        <Field
          label="Muscle groups"
          placeholder="Chest, triceps"
          value={d.tags}
          onChange={(ev) => setD({ ...d, tags: ev.target.value })}
        />
        <Field label="Exercise notes">
          <textarea
            value={d.notes}
            maxLength={10000}
            onChange={(ev) => setD({ ...d, notes: ev.target.value })}
            placeholder="Setup, cues, or equipment details"
          />
        </Field>
        <div className="actions end">
          <Button onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" className="primary" disabled={!d.name.trim()}>
            Save exercise
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function DetailGraph({ state, exercise, onOpen }) {
  const [g, setG] = useState(() => ({
    ...newGraph(exercise.id),
    metric: exercise.type === "bodyweight" ? "reps" : "weight",
    range: "all",
  }));
  return (
    <GraphCard
      state={state}
      graph={g}
      onChange={setG}
      onRemove={() => setG({ ...g, hidden: true })}
      onMove={() => {}}
      onOpen={onOpen}
      expanded
      detail
    />
  );
}
export default function Exercises({ state, update, onOpen }) {
  const [q, setQ] = useState(""),
    [archived, setArchived] = useState(false),
    [favorites, setFavorites] = useState(false),
    [edit, setEdit] = useState(null),
    [creating, setCreating] = useState(false),
    [detail, setDetail] = useState(null);
  const save = (e) =>
    update((s) => ({
      ...s,
      exercises: s.exercises.some((x) => x.id === e.id)
        ? s.exercises.map((x) => (x.id === e.id ? e : x))
        : [...s.exercises, e],
    }));
  const list = state.exercises
    .filter(
      (e) =>
        (archived || !e.archived) &&
        (!favorites || e.favorite) &&
        `${e.name} ${e.tags} ${TYPES[e.type]}`
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name),
    );
  const selected = state.exercises.find((e) => e.id === detail),
    history = selected
      ? state.workouts
          .filter((w) => w.entries.some((e) => e.exerciseId === detail))
          .sort((a, b) => b.date.localeCompare(a.date))
      : [];
  const record = records(state).find((r) => r.exercise.id === detail);
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Exercise library</h2>
          <p>Create and manage exercises.</p>
        </div>
        <Button
          className="primary"
          icon={Plus}
          onClick={() => setCreating(true)}
        >
          New exercise
        </Button>
      </div>
      <div className="toolbar">
        <div className="search">
          <Search size={17} />
          <input
            aria-label="Search exercises"
            placeholder="Search exercises or muscle groups…"
            value={q}
            onChange={(ev) => setQ(ev.target.value)}
          />
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={favorites}
            onChange={(ev) => setFavorites(ev.target.checked)}
          />
          Favorites
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={archived}
            onChange={(ev) => setArchived(ev.target.checked)}
          />
          Show archived
        </label>
      </div>
      <div className="exercise-grid">
        {list.map((e) => (
          <article className="card exercise-card" key={e.id}>
            <div className="card-top">
              <div className="exercise-symbol">
                <Dumbbell size={23} />
              </div>
              <div className="actions">
                <IconButton
                  icon={Star}
                  label={`${e.favorite ? "Unfavorite" : "Favorite"} ${e.name}`}
                  className={e.favorite ? "starred" : ""}
                  onClick={() => save({ ...e, favorite: !e.favorite })}
                />
                <IconButton
                  icon={Pencil}
                  label={`Edit ${e.name}`}
                  onClick={() => setEdit(e)}
                />
                <IconButton
                  icon={Archive}
                  label={`${e.archived ? "Restore" : "Archive"} ${e.name}`}
                  onClick={() => save({ ...e, archived: !e.archived })}
                />
              </div>
            </div>
            <button className="exercise-title" onClick={() => setDetail(e.id)}>
              {e.name}
            </button>
            <p>
              {TYPES[e.type]} · {convention(e)}
            </p>
            <div className="tags">
              {e.tags
                .split(",")
                .filter(Boolean)
                .map((t) => (
                  <span key={t}>{t.trim()}</span>
                ))}
              {e.archived && <span>Archived</span>}
            </div>
          </article>
        ))}
      </div>
      {!list.length && (
        <Empty title="No matching exercises">
          Try another search, or create your own exercise.
        </Empty>
      )}
      {(creating || edit) && (
        <ExerciseForm
          exercise={edit}
          locked={
            !!edit &&
            state.workouts.some((w) =>
              w.entries.some((e) => e.exerciseId === edit.id),
            )
          }
          initialName={q}
          onClose={() => {
            setEdit(null);
            setCreating(false);
          }}
          onSave={save}
        />
      )}
      {selected && (
        <Modal title={selected.name} wide onClose={() => setDetail(null)}>
          <p className="muted">
            {TYPES[selected.type]} · {convention(selected)}
          </p>
          <p>{selected.notes || "No exercise notes yet."}</p>
          {record && (
            <div className="notice">
              Personal record · {number(record.value)} {record.unit} ·{" "}
              {dateLabel(record.date)}
            </div>
          )}
          <DetailGraph
            key={selected.id}
            state={state}
            exercise={selected}
            onOpen={(w) => {
              setDetail(null);
              onOpen(w);
            }}
          />
          <h3>All logged sessions ({history.length})</h3>
          {history.map((w) => (
            <div className="list-row" key={w.id}>
              <button
                className="text-button"
                onClick={() => {
                  setDetail(null);
                  onOpen(w.id);
                }}
              >
                {dateLabel(w.date)} · {w.name || "Untitled workout"}
                {!w.finished ? " · draft" : ""}
              </button>
              <span className="muted">
                {w.entries
                  .filter((e) => e.exerciseId === detail)
                  .flatMap((e) => e.sets)
                  .map(
                    (s) =>
                      `${s.weightKg == null ? "BW" : load(s.weightKg, state.prefs.unit)} × ${s.reps ?? "—"}${s.warmup ? " W" : ""}${!s.done ? " (incomplete)" : ""}`,
                  )
                  .join(" / ")}
              </span>
            </div>
          ))}
        </Modal>
      )}
    </>
  );
}
