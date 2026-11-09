import test from "node:test";
import assert from "node:assert/strict";
import {
  empty,
  id,
  newSet,
  kg,
  load,
  graphData,
  copyWorkout,
  validate,
  demo,
  csv,
  week,
  records,
} from "./model.js";
const fixture = () => {
  const s = empty();
  s.workouts = [
    {
      id: id(),
      date: "2026-01-02",
      name: "Test",
      notes: "",
      finished: true,
      entries: [
        {
          id: id(),
          exerciseId: s.exercises[0].id,
          sets: [
            { ...newSet(), weightKg: 100, reps: 5, done: true },
            { ...newSet(), weightKg: 120, reps: 2, warmup: true, done: true },
            { ...newSet(), weightKg: 130, reps: 3, done: false },
          ],
        },
      ],
    },
  ];
  return s;
};
const graph = (s, metric) => ({
  id: id(),
  exerciseId: s.exercises[0].id,
  metric,
  range: "all",
  color: "#a8d878",
  hidden: false,
});
test("unit switches preserve canonical historical load", () => {
  for (const n of [0, 2.5, 135, 225.25])
    assert.ok(Math.abs(load(kg(n, "lb"), "lb") - n) < 0.001);
  const s = fixture();
  const a = graphData(s, graph(s, "weight"), "kg")[0].value,
    b = graphData(s, graph(s, "weight"), "lb")[0].value;
  assert.equal(a, 100);
  assert.equal(b, 220.46);
  assert.equal(s.workouts[0].entries[0].sets[0].weightKg, 100);
});
test("metrics exclude warmups, incomplete sets and unfinished workouts", () => {
  const s = fixture();
  assert.equal(graphData(s, graph(s, "weight"), "kg")[0].value, 100);
  assert.equal(graphData(s, graph(s, "volume"), "kg")[0].value, 500);
  assert.equal(graphData(s, graph(s, "sets"))[0].value, 1);
  assert.equal(graphData(s, graph(s, "e1rm"), "kg")[0].value, 116.67);
  s.workouts[0].finished = false;
  assert.equal(graphData(s, graph(s, "weight")).length, 0);
});
test("historical edits and renames immediately affect metrics and records", () => {
  const s = fixture();
  s.exercises[0].name = "Renamed";
  s.workouts[0].entries[0].sets[0].weightKg = 110;
  assert.equal(graphData(s, graph(s, "weight"), "kg")[0].value, 110);
  assert.equal(records(s)[0].exercise.name, "Renamed");
  s.exercises[0].archived = true;
  assert.equal(graphData(s, graph(s, "weight")).length, 1);
});
test("copy resets every completion and identity without changing source", () => {
  const s = fixture(),
    w = s.workouts[0],
    copy = copyWorkout(w);
  assert.notEqual(copy.id, w.id);
  assert.notEqual(copy.entries[0].id, w.entries[0].id);
  assert.notEqual(copy.entries[0].sets[0].id, w.entries[0].sets[0].id);
  assert.ok(copy.entries[0].sets.every((s) => !s.done));
  assert.equal(copy.finished, false);
  assert.equal(w.entries[0].sets[0].done, true);
});
test("bodyweight and assistance never generate misleading volume or e1rm", () => {
  const s = fixture();
  for (const type of ["bodyweight", "assisted", "weighted"]) {
    s.exercises[0].type = type;
    assert.equal(graphData(s, graph(s, "volume")).length, 0);
    assert.equal(graphData(s, graph(s, "e1rm")).length, 0);
  }
});
test("e1rm omits sets over 10 reps; one rep is actual load", () => {
  const s = fixture();
  s.workouts[0].entries[0].sets[0].reps = 11;
  assert.equal(graphData(s, graph(s, "e1rm")).length, 0);
  s.workouts[0].entries[0].sets[0].reps = 1;
  assert.equal(graphData(s, graph(s, "e1rm"), "kg")[0].value, 100);
});
test("same day workouts remain separate; weekly grouping sums both", () => {
  const s = fixture();
  const copy = copyWorkout(s.workouts[0]);
  copy.date = s.workouts[0].date;
  copy.finished = true;
  copy.entries[0].sets[0].done = true;
  s.workouts.push(copy);
  assert.equal(graphData(s, graph(s, "weight")).length, 2);
  assert.equal(graphData(s, graph(s, "weekly"))[0].value, 2);
  assert.equal(graphData(s, graph(s, "frequency"))[0].value, 2);
  assert.equal(week("2026-01-04"), "2025-12-29");
});
test("backup round trip includes preferences and drafts; invalid imports rejected", () => {
  const s = demo();
  assert.deepEqual(validate(JSON.parse(JSON.stringify(s))), s);
  s.workouts.push(copyWorkout(s.workouts[0]));
  assert.equal(validate(s).workouts.length, 49);
  const invalid = structuredClone(s);
  invalid.workouts[0].entries[0].sets[0].reps = -1;
  assert.throws(() => validate(invalid));
  const bad = structuredClone(s);
  bad.workouts[0].entries[0].exerciseId = "missing";
  assert.throws(() => validate(bad));
  const dup = structuredClone(s);
  dup.exercises[1].id = dup.exercises[0].id;
  assert.throws(() => validate(dup));
});
test("date validation rejects normalized invalid calendar dates", () => {
  const s = fixture();
  s.workouts[0].date = "2026-02-30";
  assert.throws(() => validate(s));
});
test("CSV quotes notes, preserves decimal weights, neutralizes spreadsheet formulas", () => {
  const s = fixture();
  s.workouts[0].name = '=HYPERLINK("evil")';
  s.workouts[0].notes = 'note, with "quotes"\nnew line';
  const data = csv(s);
  assert.ok(data.includes("'=HYPERLINK"));
  assert.ok(data.includes('note, with ""quotes""\nnew line'));
  assert.ok(data.includes("Weight (kg)"));
});
