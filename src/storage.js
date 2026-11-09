import { createClient } from "@supabase/supabase-js";
import { empty, demo, id, validate } from "./model.js";
const url = import.meta.env?.VITE_SUPABASE_URL,
  key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase =
  url && key && !url.includes("YOUR_PROJECT") ? createClient(url, key) : null;
export class Workspace {
  constructor(mode, userId, client = supabase, storage = localStorage) {
    this.mode = mode;
    this.userId = userId;
    this.client = client;
    this.storage = storage;
    this.key = `iron-ledger-v1:${mode}:${userId || "device"}`;
    this.listeners = new Set();
    this.version = 0;
    this.dirty = false;
    this.pending = null;
    this.busy = false;
    this.ready = mode !== "cloud";
    this.state = mode === "demo" ? demo() : empty();
    this.status =
      mode === "cloud"
        ? "Loading cloud history…"
        : mode === "demo"
          ? "Demo · saved on this device"
          : "Local only · cloud not connected";
    this.error = "";
    this.generation = 0;
    try {
      const stored = this.storage.getItem(this.key);
      if (stored) {
        const cached = JSON.parse(stored);
        this.state = validate(cached.state);
        this.version = cached.version || 0;
        this.dirty = !!cached.dirty;
        this.pending = cached.pending || null;
      }
    } catch (e) {
      this.error = `Local recovery failed: ${e.message}. Existing storage was not overwritten.`;
      this.blocked = true;
    }
    this.snapshot = this.view();
  }
  view() {
    return {
      state: this.state,
      status: this.status,
      error: this.error,
      ready: this.ready,
      conflict: this.conflict,
      blocked: this.blocked,
    };
  }
  emit() {
    this.snapshot = this.view();
    this.listeners.forEach((fn) => fn());
  }
  subscribe = (fn) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = () => this.snapshot;
  persist() {
    try {
      this.storage.setItem(
        this.key,
        JSON.stringify({
          state: this.state,
          version: this.version,
          dirty: this.dirty,
          pending: this.pending,
        }),
      );
      return true;
    } catch (e) {
      this.error = `Local save failed: ${e.message}. Keep this tab open and export a backup.`;
      this.emit();
      return false;
    }
  }
  update(fn) {
    if (!this.ready || this.blocked) return;
    this.state = typeof fn === "function" ? fn(this.state) : fn;
    this.generation++;
    this.dirty = true;
    this.error = "";
    const saved = this.persist();
    this.status =
      this.mode === "cloud"
        ? "Saved locally · waiting to sync"
        : saved
          ? this.mode === "demo"
            ? "Demo · saved on this device"
            : "Saved locally · not cloud synced"
          : "Local save failed";
    this.emit();
    if (this.mode === "cloud") {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flush(), 650);
    }
  }
  async init() {
    if (this.mode !== "cloud" || this.blocked) return;
    try {
      const { data, error } = await this.client
        .from("lifting_workspaces")
        .select("payload,version,last_request_id")
        .eq("user_id", this.userId)
        .maybeSingle();
      if (error) throw error;
      const remote = data || { payload: empty(), version: 0 };
      if (this.pending && data?.last_request_id === this.pending.requestId) {
        this.version = data.version;
        this.dirty =
          JSON.stringify(this.state) !== JSON.stringify(this.pending.payload);
        this.pending = null;
      } else if (this.dirty && remote.version !== this.version) {
        this.conflict = true;
        throw Error(
          "Cloud history changed on another device. Export your local backup, then load the cloud version before editing.",
        );
      } else if (!this.dirty) {
        this.state = validate(remote.payload);
        this.version = remote.version;
      }
      this.ready = true;
      this.status = this.dirty
        ? "Saved locally · waiting to sync"
        : "Cloud synced";
      this.error = "";
      this.persist();
      this.emit();
      if (this.dirty) this.flush();
    } catch (e) {
      this.ready = true;
      this.status = "Cloud unavailable · local recovery retained";
      this.error = e.message;
      this.emit();
    }
  }
  async flush() {
    if (
      this.mode !== "cloud" ||
      !this.ready ||
      this.busy ||
      this.conflict ||
      this.blocked ||
      !this.dirty
    )
      return;
    this.busy = true;
    this.status = "Syncing to cloud…";
    this.error = "";
    if (!this.pending)
      this.pending = {
        requestId: id(),
        expectedVersion: this.version,
        payload: structuredClone(this.state),
      };
    this.persist();
    this.emit();
    const request = this.pending;
    try {
      const { data, error } = await this.client.rpc("save_lifting_workspace", {
        p_payload: request.payload,
        p_expected_version: request.expectedVersion,
        p_request_id: request.requestId,
      });
      if (error) throw error;
      this.version = Number(data);
      this.dirty =
        JSON.stringify(this.state) !== JSON.stringify(request.payload);
      this.pending = null;
      this.persist();
      this.status = this.dirty
        ? "Saved locally · waiting to sync"
        : "Cloud synced";
    } catch (e) {
      if (e.message.includes("VERSION_CONFLICT")) this.conflict = true;
      this.status = "Cloud save failed · local copy retained";
      this.error = this.conflict
        ? "Another device saved changes. Export this local copy, then load the cloud version."
        : e.message;
    } finally {
      this.busy = false;
      this.emit();
      if (this.dirty && !this.error)
        this.timer = setTimeout(() => this.flush(), 100);
    }
  }
  async refresh() {
    if (this.mode !== "cloud" || this.busy || this.dirty || this.blocked)
      return;
    const generation = this.generation;
    try {
      const { data, error } = await this.client
        .from("lifting_workspaces")
        .select("payload,version")
        .eq("user_id", this.userId)
        .maybeSingle();
      if (error) throw error;
      if (data && generation === this.generation && !this.dirty) {
        this.state = validate(data.payload);
        this.version = data.version;
        this.status = "Cloud synced";
        this.error = "";
        this.persist();
        this.emit();
      }
    } catch (e) {
      this.error = e.message;
      this.status = "Cloud refresh failed · showing local copy";
      this.emit();
    }
  }
  async reloadCloud() {
    if (this.busy) return;
    this.dirty = false;
    this.pending = null;
    this.conflict = false;
    this.blocked = false;
    this.error = "";
    await this.init();
  }
  retry() {
    if (this.blocked) return;
    if (this.mode === "cloud") {
      return this.dirty ? this.flush() : this.init();
    }
    this.error = "";
    if (this.persist()) {
      this.status =
        this.mode === "demo"
          ? "Demo · saved on this device"
          : "Saved locally · not cloud synced";
    }
    this.emit();
  }
  dispose() {
    clearTimeout(this.timer);
  }
}
