import test from "node:test";
import assert from "node:assert/strict";
import { Workspace } from "./storage.js";
import { empty, id } from "./model.js";
const memory = () => {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) || null,
    setItem: (k, v) => data.set(k, v),
  };
};
function backend() {
  let row = null;
  let lost = false;
  const calls = [];
  return {
    calls,
    setLost: () => (lost = true),
    get row() {
      return row;
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }),
      }),
    }),
    rpc: async (_name, p) => {
      calls.push(p);
      if (row?.last_request_id === p.p_request_id) return { data: row.version };
      if ((row?.version || 0) !== p.p_expected_version)
        return { error: { message: "VERSION_CONFLICT" } };
      row = {
        payload: structuredClone(p.p_payload),
        version: (row?.version || 0) + 1,
        last_request_id: p.p_request_id,
      };
      if (lost) {
        lost = false;
        return { error: { message: "Lost response" } };
      }
      return { data: row.version };
    },
  };
}
test("local unfinished workouts survive reconstructed workspace", () => {
  const mem = memory(),
    s = new Workspace("local", null, null, mem);
  s.update((x) => ({ ...x, prefs: { ...x.prefs, unit: "kg" } }));
  const reopened = new Workspace("local", null, null, mem);
  assert.equal(reopened.state.prefs.unit, "kg");
  assert.equal(reopened.status, "Local only · cloud not connected");
});
test("demo and personal caches are isolated", () => {
  const mem = memory(),
    d = new Workspace("demo", null, null, mem),
    p = new Workspace("local", null, null, mem);
  assert.equal(d.state.workouts.length, 48);
  assert.equal(p.state.workouts.length, 0);
  d.update((s) => ({ ...s, prefs: { ...s.prefs, unit: "kg" } }));
  assert.equal(
    new Workspace("local", null, null, mem).state.workouts.length,
    0,
  );
});
test("atomic cloud save is idempotent after a lost response", async () => {
  const api = backend(),
    s = new Workspace("cloud", "user-a", api, memory());
  await s.init();
  s.update((x) => ({ ...x, prefs: { ...x.prefs, unit: "kg" } }));
  api.setLost();
  await s.flush();
  assert.equal(s.dirty, true);
  assert.equal(api.row.version, 1);
  const request = s.pending.requestId;
  await s.flush();
  assert.equal(s.dirty, false);
  assert.equal(api.row.version, 1);
  assert.equal(api.calls[1].p_request_id, request);
  s.dispose();
});
test("two devices cannot silently overwrite each other", async () => {
  const api = backend(),
    a = new Workspace("cloud", "user-a", api, memory()),
    b = new Workspace("cloud", "user-a", api, memory());
  await a.init();
  await b.init();
  a.update((x) => ({ ...x, prefs: { ...x.prefs, unit: "kg" } }));
  await a.flush();
  b.update((x) => ({ ...x, prefs: { ...x.prefs, theme: "light" } }));
  await b.flush();
  assert.equal(b.conflict, true);
  assert.equal(api.row.payload.prefs.unit, "kg");
  assert.equal(api.row.payload.prefs.theme, "dark");
  assert.equal(b.state.prefs.theme, "light");
  a.dispose();
  b.dispose();
});
test("cloud read refresh is safe and account caches never mix", async () => {
  const api = backend(),
    mem = memory(),
    a = new Workspace("cloud", "user-a", api, mem);
  await a.init();
  a.update((x) => ({ ...x, prefs: { ...x.prefs, unit: "kg" } }));
  await a.flush();
  const b = new Workspace("cloud", "user-a", api, memory());
  await b.init();
  assert.equal(b.state.prefs.unit, "kg");
  const other = new Workspace("cloud", "user-b", null, mem);
  assert.equal(other.state.prefs.unit, "lb");
  a.dispose();
  b.dispose();
});
test("bad cache is preserved; edits are blocked", () => {
  const mem = memory();
  mem.setItem("iron-ledger-v1:local:device", "broken json");
  const s = new Workspace("local", null, null, mem);
  assert.equal(s.blocked, true);
  s.update(empty());
  assert.equal(mem.getItem(s.key), "broken json");
});
