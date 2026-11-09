import React, { useState } from "react";
import {
  Plus,
  Copy,
  Trash2,
  Check,
  Search,
  ArrowLeft,
  CalendarDays,
  List,
  Play,
  Dumbbell,
} from "lucide-react";
import {
  id,
  newSet,
  newWorkout,
  copyWorkout,
  move,
  load,
  kg,
  today,
  convention,
  dateLabel,
  number,
  working,
  localDate,
} from "./model.js";
import {
  Button,
  IconButton,
  Field,
  Order,
  Empty,
  Modal,
  Confirm,
} from "./ui.jsx";
import { ExerciseForm } from "./Exercises.jsx";
export function WorkoutEditor({
  state,
  update,
  workoutId,
  onClose,
  onOpen,
  notify,
}) {
  const w = state.workouts.find((w) => w.id === workoutId);
  const [adding, setAdding] = useState(false),
    [q, setQ] = useState(""),
    [create, setCreate] = useState(false),
    [remove, setRemove] = useState(null),
    [deleting, setDeleting] = useState(false),
    [finish, setFinish] = useState(false);
  if (!w) return <Empty title="Choose a workout" />;
  const unit = state.prefs.unit;
  const change = (fn) =>
    update((s) => ({
      ...s,
      workouts: s.workouts.map((x) => (x.id === w.id ? fn(x) : x)),
    }));
  const entryChange = (eid, fn) =>
    change((w) => ({
      ...w,
      entries: w.entries.map((e) => (e.id === eid ? fn(e) : e)),
    }));
  const setChange = (eid, sid, patch) =>
    entryChange(eid, (e) => ({
      ...e,
      sets: e.sets.map((s) => (s.id === sid ? { ...s, ...patch } : s)),
    }));
  const addExercise = (exerciseId) => {
    change((w) => ({
      ...w,
      entries: [...w.entries, { id: id(), exerciseId, sets: [newSet()] }],
    }));
    setAdding(false);
    setQ("");
  };
  const completed = working(w).length,
    sets = w.entries.reduce((n, e) => n + e.sets.length, 0);
  const valid = () => {
    if (
      !w.entries.length ||
      !w.entries.some((e) => e.sets.some((s) => s.done))
    ) {
      notify("Complete at least one set before finishing.");
      return false;
    }
    if (!w.date) {
      notify("Choose a workout date.");
      return false;
    }
    return true;
  };
  return (
    <>
      <button className="back-link" onClick={onClose}>
        <ArrowLeft size={16} />
        Back to history
      </button>
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {w.finished ? "Workout history" : "IN PROGRESS"} ·{" "}
            {dateLabel(w.date || today(), {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </span>
          <h2>{w.name || "Untitled workout"}</h2>
          <p>
            {completed} working sets completed · {w.entries.length} exercises
          </p>
        </div>
        <div className="actions">
          <IconButton
            icon={Copy}
            label="Repeat this workout"
            onClick={() => {
              const fresh = copyWorkout(w);
              update((s) => ({ ...s, workouts: [...s.workouts, fresh] }));
              onOpen(fresh.id);
              notify("Fresh draft created. All completion boxes reset.");
            }}
          />
          <IconButton
            icon={Trash2}
            label="Delete workout"
            onClick={() => setDeleting(true)}
          />
          <Button
            className="primary"
            icon={Check}
            onClick={() => {
              if (valid()) setFinish(true);
            }}
          >
            {w.finished ? "Save & close" : "Finish workout"}
          </Button>
        </div>
      </div>
      {w.finished && (
        <div className="notice">
          Editing a finished workout. Changes save automatically and update
          graphs immediately.
        </div>
      )}
      <div className="card workout-meta">
        <Field
          label="Workout name"
          placeholder="e.g. Monday upper body"
          maxLength={200}
          value={w.name}
          onChange={(ev) => change((w) => ({ ...w, name: ev.target.value }))}
        />
        <Field
          label="Date"
          type="date"
          required
          value={w.date}
          onChange={(ev) => {
            if (ev.target.value)
              change((w) => ({ ...w, date: ev.target.value }));
          }}
        />
        <Field label="Workout notes">
          <textarea
            placeholder="How did it feel? Anything to remember?"
            value={w.notes}
            maxLength={10000}
            onChange={(ev) => change((w) => ({ ...w, notes: ev.target.value }))}
          />
        </Field>
      </div>
      <div className="workout-entries">
        {w.entries.map((entry, ei) => {
          const ex = state.exercises.find((e) => e.id === entry.exerciseId);
          const previous = state.workouts
              .filter(
                (x) =>
                  x.id !== w.id &&
                  x.finished &&
                  x.date <= w.date &&
                  x.entries.some((e) => e.exerciseId === entry.exerciseId),
              )
              .sort((a, b) => b.date.localeCompare(a.date))[0],
            prevSets =
              previous?.entries
                .filter((e) => e.exerciseId === entry.exerciseId)
                .flatMap((e) => e.sets)
                .filter((s) => s.done) || [];
          return (
            <article key={entry.id} className="card workout-exercise">
              <div className="card-top">
                <div className="exercise-heading">
                  <span className="exercise-number">
                    {String(ei + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{ex?.name}</h3>
                    <p>
                      {convention(ex)}
                      {ex?.type !== "bodyweight" ? ` · ${unit}` : ""}
                    </p>
                  </div>
                </div>
                <div className="actions">
                  <Order
                    index={ei}
                    total={w.entries.length}
                    label={ex?.name}
                    onMove={(delta) =>
                      change((w) => ({
                        ...w,
                        entries: move(w.entries, ei, delta),
                      }))
                    }
                  />
                  <IconButton
                    icon={Copy}
                    label={`Duplicate ${ex?.name}`}
                    onClick={() =>
                      change((w) => ({
                        ...w,
                        entries: [
                          ...w.entries,
                          {
                            ...entry,
                            id: id(),
                            sets: entry.sets.map((s) => ({
                              ...s,
                              id: id(),
                              done: false,
                            })),
                          },
                        ],
                      }))
                    }
                  />
                  <IconButton
                    icon={Trash2}
                    label={`Remove ${ex?.name}`}
                    onClick={() => setRemove(entry.id)}
                  />
                </div>
              </div>
              <div className="previous">
                <span>PREVIOUS SESSION</span>
                {previous ? (
                  <>
                    <strong>{dateLabel(previous.date)}</strong>
                    <span>
                      {prevSets
                        .map(
                          (s) =>
                            `${s.weightKg == null ? "BW" : `${load(s.weightKg, unit)} ${unit}`} × ${s.reps}${s.warmup ? " (warm-up)" : ""}`,
                        )
                        .join(" / ") || "No completed sets"}
                    </span>
                  </>
                ) : (
                  <span>No previous session recorded.</span>
                )}
              </div>
              <div className="sets-table">
                <div className="set-row set-labels">
                  <span>Set</span>
                  <span>Type</span>
                  <span>
                    {ex?.type === "bodyweight"
                      ? "Load"
                      : ex?.type === "assisted"
                        ? `Assist (${unit})`
                        : `Weight (${unit})`}
                  </span>
                  <span>Reps</span>
                  <span>RPE</span>
                  <span>Done</span>
                  <span />
                </div>
                {entry.sets.map((s, si) => (
                  <div
                    key={s.id}
                    className={`set-block ${s.done ? "done" : ""}`}
                  >
                    <div className="set-row">
                      <strong className="set-index">{si + 1}</strong>
                      <select
                        aria-label={`${ex?.name} set ${si + 1} type`}
                        value={s.warmup ? "warmup" : "working"}
                        onChange={(ev) =>
                          setChange(entry.id, s.id, {
                            warmup: ev.target.value === "warmup",
                          })
                        }
                      >
                        <option value="working">Working</option>
                        <option value="warmup">Warm-up</option>
                      </select>
                      {ex?.type === "bodyweight" ? (
                        <span className="bw">BW</span>
                      ) : (
                        <input
                          aria-label={`${ex?.name} set ${si + 1} weight`}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max={load(10000, unit)}
                          step="any"
                          value={load(s.weightKg, unit)}
                          placeholder="—"
                          onChange={(ev) => {
                            const v =
                              ev.target.value === ""
                                ? null
                                : kg(ev.target.value, unit);
                            if (v !== null && (v < 0 || v > 10000)) return;
                            setChange(entry.id, s.id, {
                              weightKg: v,
                              done: v === null ? false : s.done,
                            });
                          }}
                        />
                      )}
                      <input
                        aria-label={`${ex?.name} set ${si + 1} reps`}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="100000"
                        step="1"
                        value={s.reps ?? ""}
                        placeholder="—"
                        onChange={(ev) => {
                          const v =
                            ev.target.value === ""
                              ? null
                              : Number(ev.target.value);
                          if (
                            v !== null &&
                            (!Number.isInteger(v) || v < 1 || v > 100000)
                          )
                            return;
                          setChange(entry.id, s.id, {
                            reps: v,
                            done: v === null ? false : s.done,
                          });
                        }}
                      />
                      <input
                        aria-label={`${ex?.name} set ${si + 1} RPE`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="10"
                        step="0.5"
                        value={s.rpe ?? ""}
                        placeholder="—"
                        onChange={(ev) => {
                          const v =
                            ev.target.value === ""
                              ? null
                              : Number(ev.target.value);
                          if (v !== null && (v < 0 || v > 10)) return;
                          setChange(entry.id, s.id, { rpe: v });
                        }}
                      />
                      <input
                        className="set-check"
                        type="checkbox"
                        aria-label={`${ex?.name} set ${si + 1} completed`}
                        checked={s.done}
                        onChange={(ev) => {
                          if (
                            ev.target.checked &&
                            (!s.reps ||
                              (ex?.type !== "bodyweight" && s.weightKg == null))
                          ) {
                            notify(
                              "Enter weight and reps before completing this set.",
                            );
                            return;
                          }
                          setChange(entry.id, s.id, {
                            done: ev.target.checked,
                          });
                        }}
                      />
                      <IconButton
                        icon={Trash2}
                        label={`Remove ${ex?.name} set ${si + 1}`}
                        onClick={() =>
                          entryChange(entry.id, (e) => ({
                            ...e,
                            sets: e.sets.filter((x) => x.id !== s.id),
                          }))
                        }
                      />
                    </div>
                    <details className="set-options">
                      <summary>
                        {s.notes ? "Set note & options" : "Note & options"}
                      </summary>
                      <input
                        aria-label={`${ex?.name} set ${si + 1} notes`}
                        placeholder="Optional set note"
                        maxLength={10000}
                        value={s.notes}
                        onChange={(ev) =>
                          setChange(entry.id, s.id, { notes: ev.target.value })
                        }
                      />
                      <div className="actions">
                        <Order
                          index={si}
                          total={entry.sets.length}
                          label={`set ${si + 1}`}
                          onMove={(delta) =>
                            entryChange(entry.id, (e) => ({
                              ...e,
                              sets: move(e.sets, si, delta),
                            }))
                          }
                        />
                        <Button
                          icon={Copy}
                          onClick={() =>
                            entryChange(entry.id, (e) => ({
                              ...e,
                              sets: [
                                ...e.sets,
                                { ...s, id: id(), done: false },
                              ],
                            }))
                          }
                        >
                          Duplicate set
                        </Button>
                      </div>
                    </details>
                  </div>
                ))}
              </div>
              <div className="set-actions">
                <Button
                  icon={Plus}
                  onClick={() =>
                    entryChange(entry.id, (e) => ({
                      ...e,
                      sets: [...e.sets, newSet()],
                    }))
                  }
                >
                  Add set
                </Button>
                <Button
                  icon={Copy}
                  disabled={!entry.sets.length}
                  onClick={() =>
                    entryChange(entry.id, (e) => ({
                      ...e,
                      sets: [...e.sets, newSet(e.sets.at(-1))],
                    }))
                  }
                >
                  Copy previous set
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <button className="add-exercise" onClick={() => setAdding(true)}>
        <Plus size={19} /> Add exercise{" "}
        <span>Search your library or create a new movement</span>
      </button>
      <div className="editor-footer">
        <span className="muted">
          {sets} total sets · Drafts save automatically
        </span>
        <Button
          className="primary"
          icon={Check}
          onClick={() => {
            if (valid()) setFinish(true);
          }}
        >
          {w.finished ? "Save & close" : "Finish workout"}
        </Button>
      </div>
      {adding && (
        <Modal title="Add an exercise" onClose={() => setAdding(false)}>
          <div className="search">
            <Search size={17} />
            <input
              autoFocus
              aria-label="Find an exercise"
              placeholder="Search your exercises…"
              value={q}
              onChange={(ev) => setQ(ev.target.value)}
            />
          </div>
          <div className="exercise-picker">
            {state.exercises
              .filter(
                (e) =>
                  !e.archived && e.name.toLowerCase().includes(q.toLowerCase()),
              )
              .sort((a, b) => Number(b.favorite) - Number(a.favorite))
              .map((e) => (
                <button
                  key={e.id}
                  className="picker-row"
                  onClick={() => addExercise(e.id)}
                >
                  <Dumbbell size={20} />
                  <span>
                    <strong>{e.name}</strong>
                    <small>{convention(e)}</small>
                  </span>
                  <Plus size={18} />
                </button>
              ))}
          </div>
          <Button
            icon={Plus}
            onClick={() => {
              setAdding(false);
              setCreate(true);
            }}
          >
            Create {q ? `“${q}”` : "custom exercise"}
          </Button>
        </Modal>
      )}
      {create && (
        <ExerciseForm
          initialName={q}
          onClose={() => setCreate(false)}
          onSave={(e) => {
            update((s) => ({
              ...s,
              exercises: [...s.exercises, e],
              workouts: s.workouts.map((x) =>
                x.id === w.id
                  ? {
                      ...x,
                      entries: [
                        ...x.entries,
                        { id: id(), exerciseId: e.id, sets: [newSet()] },
                      ],
                    }
                  : x,
              ),
            }));
            setQ("");
          }}
        />
      )}
      {remove && (
        <Confirm
          title="Remove exercise from workout?"
          onClose={() => setRemove(null)}
          onConfirm={() =>
            change((w) => ({
              ...w,
              entries: w.entries.filter((e) => e.id !== remove),
            }))
          }
        >
          This removes its sets from this workout. The library exercise and
          other sessions are preserved.
        </Confirm>
      )}
      {deleting && (
        <Confirm
          title="Delete this workout?"
          label="Delete workout"
          onClose={() => setDeleting(false)}
          onConfirm={() => {
            update((s) => ({
              ...s,
              workouts: s.workouts.filter((x) => x.id !== w.id),
            }));
            onClose();
          }}
        >
          This removes the workout and its sets. Export a backup first if you
          might need it.
        </Confirm>
      )}
      {finish && (
        <Confirm
          title={w.finished ? "Close workout?" : "Finish this workout?"}
          label={w.finished ? "Save & close" : "Finish workout"}
          onClose={() => setFinish(false)}
          onConfirm={() => {
            change((w) => ({ ...w, finished: true }));
            notify("Workout saved. Your progress is up to date.");
            onClose();
          }}
        >
          {completed} working sets completed. Incomplete sets stay in your
          history and are excluded from progress metrics.
        </Confirm>
      )}
    </>
  );
}
export function WorkoutList({ workouts, state, onOpen, limit }) {
  return (
    <div className="workout-list">
      {workouts.slice(0, limit).map((w) => (
        <button
          key={w.id}
          className="workout-list-row"
          onClick={() => onOpen(w.id)}
        >
          <span className="date-tile">
            <small>{dateLabel(w.date, { month: "short" })}</small>
            <strong>{dateLabel(w.date, { day: "numeric" })}</strong>
          </span>
          <span className="workout-row-main">
            <strong>{w.name || "Untitled workout"}</strong>
            <small>
              {w.entries
                .map(
                  (e) =>
                    state.exercises.find((x) => x.id === e.exerciseId)?.name,
                )
                .join(" · ") || "No exercises yet"}
            </small>
          </span>
          <span className="workout-row-stats">
            <strong>{working(w).length} sets</strong>
            <small>{w.finished ? "Completed" : "Draft · resume"}</small>
          </span>
          <span className="muted">↗</span>
        </button>
      ))}
      {!workouts.length && (
        <Empty title="No workouts recorded">
          Finished workouts and drafts will appear here.
        </Empty>
      )}
    </div>
  );
}
export function History({ state, onOpen, onStart }) {
  const [q, setQ] = useState(""),
    [exercise, setExercise] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [view, setView] = useState("list"),
    [month, setMonth] = useState(today().slice(0, 7)),
    [day, setDay] = useState("");
  let list = state.workouts
    .filter(
      (w) =>
        (!q ||
          w.name.toLowerCase().includes(q.toLowerCase()) ||
          w.entries.some((e) =>
            state.exercises
              .find((x) => x.id === e.exerciseId)
              ?.name.toLowerCase()
              .includes(q.toLowerCase()),
          )) &&
        (!exercise || w.entries.some((e) => e.exerciseId === exercise)) &&
        (!from || w.date >= from) &&
        (!to || w.date <= to),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  if (view === "calendar")
    list = list.filter(
      (w) => w.date.startsWith(month) && (!day || w.date === day),
    );
  const start = new Date(month + "-01T12:00:00"),
    days = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate(),
    offset = (start.getDay() + 6) % 7;
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Workout history</h2>
          <p>View and edit recorded workouts.</p>
        </div>
        <Button className="primary" icon={Plus} onClick={() => onStart()}>
          Log workout
        </Button>
      </div>
      <div className="toolbar">
        <div className="search">
          <Search size={17} />
          <input
            aria-label="Search history"
            value={q}
            onChange={(ev) => setQ(ev.target.value)}
            placeholder="Search workouts or exercises…"
          />
        </div>
        <div className="segmented">
          <button
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <List size={16} />
            List
          </button>
          <button
            aria-pressed={view === "calendar"}
            onClick={() => setView("calendar")}
          >
            <CalendarDays size={16} />
            Calendar
          </button>
        </div>
      </div>
      <div className="filter-row">
        <Field label="Exercise">
          <select
            value={exercise}
            onChange={(ev) => setExercise(ev.target.value)}
          >
            <option value="">All exercises</option>
            {state.exercises.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="From"
          type="date"
          value={from}
          onChange={(ev) => setFrom(ev.target.value)}
        />
        <Field
          label="To"
          type="date"
          value={to}
          onChange={(ev) => setTo(ev.target.value)}
        />
        <Button
          onClick={() => {
            setQ("");
            setExercise("");
            setFrom("");
            setTo("");
            setDay("");
          }}
        >
          Clear filters
        </Button>
      </div>
      {view === "calendar" && (
        <div className="card calendar">
          <div className="section-heading">
            <Field
              label="Month"
              type="month"
              value={month}
              onChange={(ev) => {
                if (ev.target.value) {
                  setMonth(ev.target.value);
                  setDay("");
                }
              }}
            />
            <Button onClick={() => setDay("")}>Show whole month</Button>
          </div>
          <div className="calendar-grid">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <span key={d} className="muted">
                {d}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={"offset" + i} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const date = month + "-" + String(i + 1).padStart(2, "0"),
                count = state.workouts.filter((w) => w.date === date).length;
              return (
                <button
                  aria-label={`${date}: ${count} workouts`}
                  aria-pressed={day === date}
                  key={date}
                  className={count ? "has-workout" : ""}
                  onClick={() => setDay(date)}
                >
                  {i + 1}
                  {count > 0 && (
                    <small>
                      {count} {count === 1 ? "session" : "sessions"}
                    </small>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-top">
          <h3>
            {list.length} {list.length === 1 ? "workout" : "workouts"}
            {day ? ` · ${dateLabel(day)}` : ""}
          </h3>
          {day && (
            <Button icon={Plus} onClick={() => onStart(day)}>
              Log on this day
            </Button>
          )}
        </div>
        <WorkoutList workouts={list} {...{ state, onOpen }} />
      </div>
    </>
  );
}
