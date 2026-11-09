import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { empty, id } from "./model.js";
test("Postgres schema enforces owner isolation, atomic versions and idempotent retries", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
    await db.exec(
      await readFile(
        new URL("../database/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    const a = id(),
      b = id(),
      request = id(),
      payload = JSON.stringify(empty());
    await db.query("insert into auth.users values ($1),($2)", [a, b]);
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${a}';`);
    const save = (version, req = request) =>
      db.query(
        "select public.save_lifting_workspace($1::jsonb,$2,$3::uuid) as version",
        [payload, version, req],
      );
    assert.equal((await save(0)).rows[0].version, 1);
    assert.equal((await save(0)).rows[0].version, 1);
    await assert.rejects(save(0, id()), /VERSION_CONFLICT/);
    assert.equal(
      (await db.query("select version from public.lifting_workspaces")).rows[0]
        .version,
      1,
    );
    await assert.rejects(
      db.exec("update public.lifting_workspaces set version=999"),
      /permission denied/,
    );
    await db.exec(`set request.jwt.claim.sub='${b}';`);
    assert.equal(
      (await db.query("select * from public.lifting_workspaces")).rows.length,
      0,
    );
    assert.equal((await save(0, id())).rows[0].version, 1);
    assert.equal(
      (await db.query("select user_id from public.lifting_workspaces")).rows[0]
        .user_id,
      b,
    );
    await db.exec("reset role; set role anon; set request.jwt.claim.sub='';");
    await assert.rejects(save(0, id()), /permission denied/);
    await assert.rejects(
      db.query("select * from public.lifting_workspaces"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
