export const id = () => crypto.randomUUID();
export const today = () => localDate(new Date());
export const localDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const dateLabel = (d, options = { month: "short", day: "numeric" }) =>
  new Date(`${d}T12:00:00`).toLocaleDateString(undefined, options);
export const kg = (n, unit) =>
  unit === "lb" ? Number(n) * 0.45359237 : Number(n);
export const load = (n, unit) =>
  n == null ? "" : Math.round((unit === "lb" ? n / 0.45359237 : n) * 100) / 100;
export const number = (n) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
export const TYPES = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  machine: "Machine",
  cable: "Cable",
  bodyweight: "Bodyweight",
  weighted: "Weighted bodyweight",
  assisted: "Assisted",
};
export const convention = (e) =>
  e?.type === "dumbbell"
    ? "Per dumbbell"
    : e?.type === "weighted"
      ? "Added weight only"
      : e?.type === "assisted"
        ? "Assistance (less is harder)"
        : e?.type === "bodyweight"
          ? "Bodyweight · reps only"
          : "Total external load";
export const weighted = (e) =>
  ["barbell", "dumbbell", "machine", "cable"].includes(e?.type);
export const metrics = {
  weight: {
    name: "Heaviest working set",
    description:
      "Highest completed working-set load in each session. Dumbbell load is per dumbbell.",
  },
  reps: {
    name: "Best reps at weight",
    description:
      "Most reps in a completed working set at the selected load (±0.01 kg). For bodyweight, all completed working sets.",
  },
  volume: {
    name: "Working-set volume",
    description:
      "Sum of load × reps across completed working sets. Dumbbells use weight per dumbbell; not doubled. Only external-load exercises.",
  },
  sets: {
    name: "Working sets / session",
    description: "Count of completed working sets in each session.",
  },
  weekly: {
    name: "Working sets / week",
    description:
      "Completed working sets grouped by local Monday. Weeks without sessions are omitted.",
  },
  e1rm: {
    name: "Estimated one-rep max",
    description:
      "Epley estimate: load × (1 + reps / 30), for 1–10 reps; 1 rep uses actual load. External-load exercises only. An estimate, not a tested maximum.",
  },
  frequency: {
    name: "Workout frequency / week",
    description:
      "Finished workouts per local Monday-based week. Weeks without workouts are omitted.",
  },
};
export const allowed = (metric, e) =>
  !["volume", "e1rm"].includes(metric) || weighted(e);
const seed = [
  ["Barbell bench press", "barbell", "Chest, Triceps"],
  ["Back squat", "barbell", "Quads, Glutes"],
  ["Deadlift", "barbell", "Back, Hamstrings"],
  ["Incline dumbbell bench", "dumbbell", "Chest, Shoulders"],
  ["Pull-up", "bodyweight", "Back, Biceps"],
  ["Cable row", "cable", "Back"],
  ["Overhead press", "barbell", "Shoulders"],
  ["Assisted pull-up", "assisted", "Back"],
];
export const defaultPrefs = () => ({
  theme: "dark",
  accent: "#a8d878",
  unit: "lb",
  collapsed: false,
  layout: ["activity", "graphs", "recent", "records"],
  hidden: [],
});
export const empty = () => ({
  schemaVersion: 1,
  exercises: seed.map(([name, type, tags], i) => ({
    id: `exercise-${i}`,
    name,
    type,
    tags,
    notes: "",
    favorite: i < 3,
    archived: false,
  })),
  workouts: [],
  graphs: [],
  prefs: defaultPrefs(),
});
export const newSet = (previous) => ({
  id: id(),
  weightKg: previous?.weightKg ?? null,
  reps: previous?.reps ?? null,
  rpe: previous?.rpe ?? null,
  notes: "",
  warmup: false,
  done: false,
});
export const newWorkout = () => ({
  id: id(),
  date: today(),
  name: "",
  notes: "",
  finished: false,
  entries: [],
});
export const copyWorkout = (w) => ({
  ...structuredClone(w),
  id: id(),
  date: today(),
  finished: false,
  entries: w.entries.map((e) => ({
    ...e,
    id: id(),
    sets: e.sets.map((s) => ({ ...s, id: id(), done: false })),
  })),
});
export const move = (items, index, delta) => {
  const next = [...items],
    to = index + delta;
  if (to < 0 || to >= items.length) return next;
  [next[index], next[to]] = [next[to], next[index]];
  return next;
};
export const working = (w) =>
  w.entries.flatMap((e) =>
    e.sets
      .filter((s) => s.done && !s.warmup && s.reps > 0)
      .map((s) => ({ ...s, exerciseId: e.exerciseId })),
  );
export function week(d) {
  const dt = new Date(d + "T12:00:00");
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return localDate(dt);
}
export function rangeStart(range, now = today()) {
  if (range === "all" || range === "custom") return "";
  const d = new Date(now + "T12:00:00");
  d.setMonth(d.getMonth() - Number(range));
  return localDate(d);
}
export function graphData(state, g, unit = state.prefs.unit) {
  const e = state.exercises.find((x) => x.id === g.exerciseId);
  if (!allowed(g.metric, e)) return [];
  const convert = (n) => (unit === "lb" ? n / 0.45359237 : n);
  const start = g.range === "custom" ? g.from : rangeStart(g.range),
    end = g.range === "custom" ? g.to : today();
  let rows = [];
  for (const w of state.workouts
    .filter(
      (w) =>
        w.finished && (!start || w.date >= start) && (!end || w.date <= end),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
    const sets = working(w).filter((s) => s.exerciseId === g.exerciseId);
    let included = sets;
    let value = null;
    switch (g.metric) {
      case "frequency":
        value = 1;
        break;
      case "sets":
      case "weekly":
        value = sets.length || null;
        break;
      case "weight":
        included = sets.filter((s) => s.weightKg != null);
        value = included.length
          ? Math.max(...included.map((s) => convert(s.weightKg)))
          : null;
        break;
      case "volume":
        included = sets.filter((s) => s.weightKg != null);
        value = included.length
          ? included.reduce((a, s) => a + convert(s.weightKg) * s.reps, 0)
          : null;
        break;
      case "reps":
        included = sets.filter(
          (s) =>
            e?.type === "bodyweight" ||
            (s.weightKg != null &&
              Math.abs(s.weightKg - (g.targetKg ?? 0)) < 0.01),
        );
        value = included.length
          ? Math.max(...included.map((s) => s.reps))
          : null;
        break;
      case "e1rm":
        included = sets.filter((s) => s.reps <= 10 && s.weightKg > 0);
        value = included.length
          ? Math.max(
              ...included.map(
                (s) =>
                  convert(s.weightKg) * (s.reps === 1 ? 1 : 1 + s.reps / 30),
              ),
            )
          : null;
        break;
    }
    if (value != null)
      rows.push({
        date: w.date,
        value: Math.round(value * 100) / 100,
        workoutId: w.id,
        workoutIds: [w.id],
        name: w.name || "Untitled workout",
        sets: included,
      });
  }
  if (["frequency", "weekly"].includes(g.metric)) {
    const groups = new Map();
    for (const p of rows) {
      const d = week(p.date),
        old = groups.get(d);
      if (old) {
        old.value += p.value;
        old.workoutIds.push(...p.workoutIds);
        old.sets.push(...p.sets);
      } else
        groups.set(d, {
          ...p,
          date: d,
          sets: [...p.sets],
          workoutIds: [...p.workoutIds],
        });
    }
    rows = [...groups.values()];
  }
  return rows;
}
export const metricUnit = (metric, unit) =>
  ["weight", "e1rm"].includes(metric)
    ? unit
    : metric === "volume"
      ? `${unit}·reps`
      : metric === "reps"
        ? "reps"
        : metric === "frequency"
          ? "workouts"
          : "sets";
export function records(state) {
  return state.exercises
    .flatMap((e) => {
      const g = {
          exerciseId: e.id,
          metric: e.type === "bodyweight" ? "reps" : "weight",
          range: "all",
        },
        rows = graphData(state, g);
      if (!rows.length) return [];
      const best = rows.reduce((a, b) =>
        e.type === "assisted"
          ? b.value < a.value
            ? b
            : a
          : b.value >= a.value
            ? b
            : a,
      );
      return [
        {
          ...best,
          exercise: e,
          value: best.value,
          unit: e.type === "bodyweight" ? "reps" : state.prefs.unit,
        },
      ];
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
export function demo() {
  const s = empty();
  for (let n = 0; n < 48; n++) {
    const d = new Date();
    d.setDate(d.getDate() - (47 - n) * 3 - 1);
    const upper = n % 2 === 0;
    const indices = upper ? [0, 3, 5] : [1, 2, 6];
    s.workouts.push({
      id: `demo-${n}`,
      date: localDate(d),
      name: upper ? "Upper body" : "Lower body",
      notes: n === 47 ? "Good session. Kept the last set controlled." : "",
      finished: true,
      entries: indices.map((i, j) => ({
        id: `demo-entry-${n}-${j}`,
        exerciseId: s.exercises[i].id,
        sets: Array.from({ length: 3 }, (_, k) => ({
          id: `demo-set-${n}-${j}-${k}`,
          weightKg: kg(
            (upper ? [135, 40, 100] : [185, 225, 85])[j] +
              Math.floor(n / 6) * 5,
            "lb",
          ),
          reps: 8 - (k === 2 ? 1 : 0),
          rpe: k === 2 ? 8 : null,
          notes: "",
          warmup: false,
          done: true,
        })),
      })),
    });
  }
  s.graphs = [
    {
      id: id(),
      exerciseId: s.exercises[0].id,
      metric: "weight",
      range: "6",
      color: "#a8d878",
      hidden: false,
    },
    {
      id: id(),
      exerciseId: s.exercises[1].id,
      metric: "volume",
      range: "6",
      color: "#a99bff",
      hidden: false,
    },
  ];
  return s;
}
function assert(ok, message) {
  if (!ok) throw Error(message);
}
export function validate(raw) {
  assert(raw && raw.schemaVersion === 1, "Unsupported backup version.");
  assert(
    Array.isArray(raw.exercises) &&
      Array.isArray(raw.workouts) &&
      Array.isArray(raw.graphs),
    "Backup must contain exercises, workouts and graphs.",
  );
  assert(
    raw.exercises.length <= 10000 &&
      raw.workouts.length <= 100000 &&
      raw.graphs.length <= 100,
    "Backup is too large.",
  );
  const string = (v, max = 10000) => typeof v === "string" && v.length <= max;
  const seen = new Set();
  const ident = (v) => {
    assert(
      string(v, 100) && v.length > 0 && !seen.has(v),
      "Missing or duplicate identifier.",
    );
    seen.add(v);
  };
  for (const e of raw.exercises) {
    ident(e.id);
    assert(
      string(e.name, 200) && e.name.trim() && Object.hasOwn(TYPES, e.type),
      "Invalid exercise.",
    );
    assert(
      string(e.tags) &&
        string(e.notes) &&
        typeof e.favorite === "boolean" &&
        typeof e.archived === "boolean",
      "Invalid exercise fields.",
    );
  }
  const exerciseIds = new Set(raw.exercises.map((e) => e.id));
  for (const w of raw.workouts) {
    ident(w.id);
    assert(
      /^\d{4}-\d{2}-\d{2}$/.test(w.date) &&
        localDate(new Date(w.date + "T12:00:00")) === w.date,
      "Invalid workout date.",
    );
    assert(
      string(w.name, 200) &&
        string(w.notes) &&
        typeof w.finished === "boolean" &&
        Array.isArray(w.entries) &&
        w.entries.length <= 200,
      "Invalid workout.",
    );
    for (const e of w.entries) {
      ident(e.id);
      assert(
        exerciseIds.has(e.exerciseId) &&
          Array.isArray(e.sets) &&
          e.sets.length <= 1000,
        "Unknown exercise or invalid sets.",
      );
      for (const s of e.sets) {
        ident(s.id);
        for (const [key, max] of [
          ["weightKg", 10000],
          ["reps", 100000],
          ["rpe", 10],
        ])
          assert(
            s[key] === null ||
              (typeof s[key] === "number" &&
                Number.isFinite(s[key]) &&
                s[key] >= 0 &&
                s[key] <= max &&
                (key !== "reps" || Number.isInteger(s[key]))),
            "Invalid set numbers.",
          );
        assert(
          typeof s.done === "boolean" &&
            typeof s.warmup === "boolean" &&
            string(s.notes),
          "Invalid set fields.",
        );
        assert(
          !s.done ||
            (s.reps > 0 &&
              (raw.exercises.find((x) => x.id === e.exerciseId).type ===
                "bodyweight" ||
                s.weightKg !== null)),
          "Completed sets need reps and load.",
        );
      }
    }
  }
  for (const g of raw.graphs) {
    ident(g.id);
    assert(
      exerciseIds.has(g.exerciseId) &&
        Object.hasOwn(metrics, g.metric) &&
        ["1", "3", "6", "12", "all", "custom"].includes(g.range) &&
        /^#[0-9a-f]{6}$/i.test(g.color) &&
        typeof g.hidden === "boolean",
      "Invalid graph.",
    );
    assert(
      g.targetKg == null ||
        (typeof g.targetKg === "number" &&
          Number.isFinite(g.targetKg) &&
          g.targetKg >= 0 &&
          g.targetKg <= 10000),
      "Invalid selected load.",
    );
    if (g.range === "custom")
      assert(
        /^\d{4}-\d{2}-\d{2}$/.test(g.from) &&
          /^\d{4}-\d{2}-\d{2}$/.test(g.to) &&
          localDate(new Date(g.from + "T12:00:00")) === g.from &&
          localDate(new Date(g.to + "T12:00:00")) === g.to &&
          g.from <= g.to,
        "Invalid graph date range.",
      );
  }
  const p = raw.prefs;
  assert(
    p &&
      ["dark", "light", "system"].includes(p.theme) &&
      /^#[0-9a-f]{6}$/i.test(p.accent) &&
      ["lb", "kg"].includes(p.unit) &&
      typeof p.collapsed === "boolean",
    "Invalid preferences.",
  );
  for (const key of ["layout", "hidden"])
    assert(
      Array.isArray(p[key]) &&
        new Set(p[key]).size === p[key].length &&
        p[key].every((v) =>
          ["activity", "graphs", "recent", "records"].includes(v),
        ),
      "Invalid dashboard layout.",
    );
  assert(p.layout.length === 4, "Dashboard layout is incomplete.");
  return structuredClone(raw);
}
export function csv(state) {
  const rows = [
    [
      "Workout ID",
      "Date",
      "Workout",
      "Workout notes",
      "Exercise ID",
      "Exercise",
      "Equipment",
      "Load convention",
      "Set",
      "Weight (kg)",
      "Weight (lb)",
      "Reps",
      "RPE",
      "Warmup",
      "Completed",
      "Set notes",
    ],
  ];
  for (const w of state.workouts)
    for (const entry of w.entries) {
      const e = state.exercises.find((e) => e.id === entry.exerciseId);
      entry.sets.forEach((s, i) =>
        rows.push([
          w.id,
          w.date,
          w.name,
          w.notes,
          e.id,
          e.name,
          TYPES[e.type],
          convention(e),
          i + 1,
          s.weightKg,
          load(s.weightKg, "lb"),
          s.reps,
          s.rpe,
          s.warmup,
          s.done,
          s.notes,
        ]),
      );
    }
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((v) => {
            let str = String(v ?? "");
            if (/^[=+@\-\t\r]/.test(str)) str = "'" + str;
            return '"' + str.replaceAll('"', '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}
