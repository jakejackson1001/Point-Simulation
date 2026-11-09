import React, { useState } from "react";
import {
  Plus,
  Maximize2,
  EyeOff,
  Trash2,
  Table2,
  ChartNoAxesCombined,
} from "lucide-react";
import {
  graphData,
  metrics,
  metricUnit,
  number,
  dateLabel,
  load,
  kg,
  allowed,
  id,
  convention,
  today,
} from "./model.js";
import {
  Button,
  IconButton,
  Field,
  Empty,
  Order,
  Modal,
  Confirm,
} from "./ui.jsx";
export const newGraph = (exerciseId) => ({
  id: id(),
  exerciseId,
  metric: "weight",
  range: "6",
  color: "#a8d878",
  hidden: false,
  targetKg: 0,
});
export function GraphCard({
  state,
  graph: g,
  onChange,
  onRemove,
  onMove,
  index = 0,
  total = 1,
  onOpen,
  expanded = false,
  detail = false,
}) {
  const [table, setTable] = useState(false),
    [point, setPoint] = useState(null),
    [expand, setExpand] = useState(false),
    [confirm, setConfirm] = useState(false),
    [config, setConfig] = useState(false);
  const e = state.exercises.find((e) => e.id === g.exerciseId),
    rows = graphData(state, g),
    unit = metricUnit(g.metric, state.prefs.unit);
  const latest = rows.at(-1),
    first = rows[0],
    change = latest && first ? latest.value - first.value : 0;
  const times = rows.map((p) => new Date(p.date + "T12:00:00").getTime()),
    minX = Math.min(...times),
    maxX = Math.max(...times);
  const min = Math.min(...rows.map((p) => p.value)),
    max = Math.max(...rows.map((p) => p.value)),
    padding = Math.max((max - min) * 0.3, max * 0.05, 1),
    lo = Math.max(0, min - padding),
    hi = max + padding;
  const x = (i) =>
      maxX === minX ? 330 : 58 + ((times[i] - minX) / (maxX - minX)) * 554,
    y = (v) => 218 - ((v - lo) / (hi - lo)) * 166;
  return (
    <article
      className={`card graph-card ${expanded ? "expanded" : ""}`}
      style={{ "--series": g.color }}
    >
      <div className="card-top">
        <div>
          <span className="eyebrow">
            <i className="dot" style={{ background: g.color }} />
            {metrics[g.metric].name}
          </span>
          <h3>
            {g.metric === "frequency"
              ? "Workout consistency"
              : e?.name || "Exercise"}
          </h3>
        </div>
        <div className="actions">
          <IconButton
            icon={table ? ChartNoAxesCombined : Table2}
            label={table ? "Show chart" : "Show data table"}
            onClick={() => setTable(!table)}
          />
          {!expanded && (
            <IconButton
              icon={Maximize2}
              label="Expand graph"
              onClick={() => setExpand(true)}
            />
          )}
          <button
            className="text-button"
            aria-expanded={config}
            onClick={() => setConfig(!config)}
          >
            Edit
          </button>
        </div>
      </div>
      <div className="graph-summary">
        <strong>
          {latest ? number(latest.value) : "—"} <small>{unit}</small>
        </strong>
        {rows.length > 1 && (
          <span className="change">
            {change > 0 ? "+" : ""}
            {number(change)} <span className="muted">over this period</span>
          </span>
        )}
        <span className="range-label">
          {g.range === "all"
            ? "All time"
            : g.range === "custom"
              ? "Custom range"
              : `${g.range} months`}
        </span>
      </div>
      {config && (
        <div className="graph-config">
          <Field label="Exercise">
            <select
              value={g.exerciseId}
              onChange={(ev) => {
                const exercise = state.exercises.find(
                  (x) => x.id === ev.target.value,
                );
                onChange({
                  ...g,
                  exerciseId: exercise.id,
                  metric: allowed(g.metric, exercise) ? g.metric : "sets",
                });
                setPoint(null);
              }}
            >
              {state.exercises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.archived ? " (archived)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Metric">
            <select
              value={g.metric}
              onChange={(ev) => {
                onChange({ ...g, metric: ev.target.value });
                setPoint(null);
              }}
            >
              {Object.entries(metrics)
                .filter(
                  ([k]) =>
                    allowed(k, e) &&
                    (e?.type !== "bodyweight" || k !== "weight"),
                )
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Date range">
            <select
              value={g.range}
              onChange={(ev) => {
                onChange({
                  ...g,
                  range: ev.target.value,
                  from:
                    g.from ||
                    [today(), ...state.workouts.map((w) => w.date)].sort()[0],
                  to: g.to || today(),
                });
                setPoint(null);
              }}
            >
              {[
                ["1", "1 month"],
                ["3", "3 months"],
                ["6", "6 months"],
                ["12", "1 year"],
                ["all", "All time"],
                ["custom", "Custom"],
              ].map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Series color">
            <input
              type="color"
              value={g.color}
              onChange={(ev) => onChange({ ...g, color: ev.target.value })}
            />
          </Field>
          {g.range === "custom" && (
            <>
              <Field
                label="From"
                type="date"
                value={g.from || ""}
                max={g.to}
                onChange={(ev) => {
                  if (ev.target.value && ev.target.value <= g.to)
                    onChange({ ...g, from: ev.target.value });
                }}
              />
              <Field
                label="To"
                type="date"
                value={g.to || ""}
                min={g.from}
                onChange={(ev) => {
                  if (ev.target.value && ev.target.value >= g.from)
                    onChange({ ...g, to: ev.target.value });
                }}
              />
            </>
          )}
          {g.metric === "reps" && e?.type !== "bodyweight" && (
            <Field
              label={`Selected load (${state.prefs.unit})`}
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={load(g.targetKg ?? 0, state.prefs.unit)}
              onChange={(ev) =>
                onChange({
                  ...g,
                  targetKg: kg(ev.target.value, state.prefs.unit),
                })
              }
            />
          )}
          {!detail && (
            <div className="actions">
              <Order
                index={index}
                total={total}
                label="graph"
                onMove={onMove}
              />
              <Button
                icon={EyeOff}
                onClick={() => onChange({ ...g, hidden: true })}
              >
                Hide
              </Button>
              <IconButton
                icon={Trash2}
                label="Remove graph"
                onClick={() => setConfirm(true)}
              />
            </div>
          )}
        </div>
      )}
      {!rows.length ? (
        <Empty title="No matching workout data">
          Complete working sets to see data for this metric and date range.
        </Empty>
      ) : table ? (
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              {e?.name} — {metrics[g.metric].name}
            </caption>
            <thead>
              <tr>
                <th>Date</th>
                <th>{unit}</th>
                <th>Included sets</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={`${p.workoutId}-${i}`}>
                  <td>
                    {dateLabel(p.date, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td>{number(p.value)}</td>
                  <td>
                    {p.sets
                      .map(
                        (s) =>
                          `${s.weightKg == null ? "BW" : load(s.weightKg, state.prefs.unit)} × ${s.reps}`,
                      )
                      .join(", ") || "—"}
                  </td>
                  <td>
                    {p.workoutIds.map((w) => (
                      <button
                        key={w}
                        className="text-button"
                        onClick={() => onOpen(w)}
                      >
                        Open workout
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart-wrap">
          <svg
            viewBox="0 0 650 266"
            role="group"
            aria-label={`${e?.name || "Workout"} ${metrics[g.metric].name}. Use Tab to inspect data points.`}
          >
            {[0, 1, 2, 3].map((i) => {
              const v = lo + ((hi - lo) * i) / 3;
              return (
                <g key={i}>
                  <line
                    x1="58"
                    x2="612"
                    y1={y(v)}
                    y2={y(v)}
                    stroke="var(--border)"
                    strokeDasharray="3 6"
                  />
                  <text x="44" y={y(v) + 4} textAnchor="end">
                    {number(v)}
                  </text>
                </g>
              );
            })}
            {rows.length > 1 && (
              <>
                <defs>
                  <linearGradient
                    id={`fade-${g.id}-${expanded}`}
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={g.color} stopOpacity=".16" />
                    <stop offset="100%" stopColor={g.color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={`M${x(0)},218 ${rows.map((p, i) => `L${x(i)},${y(p.value)}`).join(" ")} L${x(rows.length - 1)},218 Z`}
                  fill={`url(#fade-${g.id}-${expanded})`}
                />
                <polyline
                  points={rows.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")}
                  fill="none"
                  stroke={g.color}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
              </>
            )}
            {rows.map((p, i) => (
              <g
                key={`${p.workoutId}-${i}`}
                role="button"
                tabIndex="0"
                aria-label={`${dateLabel(p.date)}: ${number(p.value)} ${unit}. Inspect point`}
                onMouseEnter={() => setPoint(i)}
                onFocus={() => setPoint(i)}
                onClick={() => setPoint(i)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    setPoint(i);
                  }
                }}
              >
                <circle cx={x(i)} cy={y(p.value)} r="12" fill="transparent" />
                <circle
                  cx={x(i)}
                  cy={y(p.value)}
                  r={point === i ? 5 : 3}
                  fill={g.color}
                  stroke="var(--card)"
                  strokeWidth="2"
                />
                <title>
                  {dateLabel(p.date)} · {number(p.value)} {unit}
                </title>
              </g>
            ))}
            {[
              ...new Set([
                0,
                Math.floor((rows.length - 1) / 2),
                rows.length - 1,
              ]),
            ].map((i) => (
              <text key={i} x={x(i)} y="250" textAnchor="middle">
                {dateLabel(rows[i].date)}
              </text>
            ))}
          </svg>
          {point != null && rows[point] && (
            <div className="point-detail">
              <strong>
                {dateLabel(rows[point].date)} · {number(rows[point].value)}{" "}
                {unit}
              </strong>
              <span>
                {rows[point].sets
                  .map(
                    (s) =>
                      `${s.weightKg == null ? "BW" : `${load(s.weightKg, state.prefs.unit)} ${state.prefs.unit}`} × ${s.reps}`,
                  )
                  .join(" / ")}
              </span>
              <div className="actions">
                {rows[point].workoutIds.map((w) => (
                  <button
                    key={w}
                    className="text-button"
                    onClick={() => onOpen(w)}
                  >
                    Open source workout ↗
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="graph-foot">
        <span>
          <i className="dot" style={{ background: g.color }} />
          Completed working sets
        </span>
        <details>
          <summary aria-label="Metric definition">ⓘ Metric definition</summary>
          <p>
            {metrics[g.metric].description}{" "}
            {g.metric !== "frequency" && convention(e)}. Warm-ups and incomplete
            sets excluded.
          </p>
        </details>
      </div>
      {expand && (
        <Modal title="Progress in detail" wide onClose={() => setExpand(false)}>
          <GraphCard
            {...{
              state,
              graph: g,
              onChange,
              onRemove,
              onMove,
              index,
              total,
              onOpen,
            }}
            expanded
          />
        </Modal>
      )}
      {confirm && (
        <Confirm
          title="Remove this graph?"
          label="Remove graph"
          onClose={() => setConfirm(false)}
          onConfirm={onRemove}
        >
          Your workout history will be preserved.
        </Confirm>
      )}
    </article>
  );
}
export function Graphs({ state, update, onOpen }) {
  const [adding, setAdding] = useState(false),
    [exercise, setExercise] = useState(state.exercises[0]?.id || ""),
    [metric, setMetric] = useState("weight"),
    [range, setRange] = useState("6");
  const change = (g) =>
    update((s) => ({
      ...s,
      graphs: s.graphs.map((x) => (x.id === g.id ? g : x)),
    }));
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Your progress</h2>
          <p>Charts from recorded workouts.</p>
        </div>
        <Button icon={Plus} onClick={() => setAdding(true)}>
          Add graph
        </Button>
      </div>
      <div className="graph-grid">
        {state.graphs
          .filter((g) => !g.hidden)
          .map((g) => (
            <GraphCard
              key={g.id}
              {...{ state, graph: g, onOpen }}
              index={state.graphs.findIndex((x) => x.id === g.id)}
              total={state.graphs.length}
              onChange={change}
              onRemove={() =>
                update((s) => ({
                  ...s,
                  graphs: s.graphs.filter((x) => x.id !== g.id),
                }))
              }
              onMove={(delta) =>
                update((s) => {
                  const list = [...s.graphs],
                    i = list.findIndex((x) => x.id === g.id),
                    j = i + delta;
                  if (j >= 0 && j < list.length)
                    [list[i], list[j]] = [list[j], list[i]];
                  return { ...s, graphs: list };
                })
              }
            />
          ))}
        {!state.graphs.some((g) => !g.hidden) && (
          <div className="card">
            <Empty
              title="No graphs added"
              action={
                <Button icon={Plus} onClick={() => setAdding(true)}>
                  Add your first graph
                </Button>
              }
            >
              Add a graph to display workout data.
            </Empty>
          </div>
        )}
      </div>
      {state.graphs.some((g) => g.hidden) && (
        <details className="hidden-graphs">
          <summary>
            Hidden graphs ({state.graphs.filter((g) => g.hidden).length})
          </summary>
          {state.graphs
            .filter((g) => g.hidden)
            .map((g) => (
              <div className="list-row" key={g.id}>
                <span>
                  {state.exercises.find((e) => e.id === g.exerciseId)?.name} ·{" "}
                  {metrics[g.metric].name}
                </span>
                <Button onClick={() => change({ ...g, hidden: false })}>
                  Restore
                </Button>
                <Button
                  onClick={() =>
                    update((s) => ({
                      ...s,
                      graphs: s.graphs.filter((x) => x.id !== g.id),
                    }))
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
        </details>
      )}
      {adding && (
        <Modal title="Add a progress graph" onClose={() => setAdding(false)}>
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              update((s) => ({
                ...s,
                graphs: [...s.graphs, { ...newGraph(exercise), metric, range }],
              }));
              setAdding(false);
            }}
          >
            <p className="muted">Select an exercise, metric, and date range.</p>
            <Field label="Exercise">
              <select
                value={exercise}
                onChange={(ev) => {
                  setExercise(ev.target.value);
                  setMetric("sets");
                }}
              >
                {state.exercises.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Metric">
              <select
                value={metric}
                onChange={(ev) => setMetric(ev.target.value)}
              >
                {Object.entries(metrics)
                  .filter(
                    ([k]) =>
                      allowed(
                        k,
                        state.exercises.find((e) => e.id === exercise),
                      ) &&
                      (k !== "weight" ||
                        state.exercises.find((e) => e.id === exercise)?.type !==
                          "bodyweight"),
                  )
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Date range">
              <select
                value={range}
                onChange={(ev) => setRange(ev.target.value)}
              >
                {[
                  ["1", "1 month"],
                  ["3", "3 months"],
                  ["6", "6 months"],
                  ["12", "1 year"],
                  ["all", "All time"],
                ].map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <div className="actions end">
              <Button
                type="submit"
                className="primary"
                icon={Plus}
                disabled={!exercise}
              >
                Add graph
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
