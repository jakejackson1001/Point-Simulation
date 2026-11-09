import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useRef,
} from "react";
import {
  LayoutDashboard,
  Dumbbell,
  CalendarDays,
  Library,
  ChartNoAxesCombined,
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ArrowUpRight,
  SlidersHorizontal,
  Flame,
  Trophy,
  Activity,
  Menu,
  X,
  Cloud,
  ChevronRight,
  Play,
  Check,
  Download,
} from "lucide-react";
import { Workspace, supabase } from "./storage.js";
import {
  today,
  newWorkout,
  copyWorkout,
  working,
  records,
  number,
  dateLabel,
  move,
  id,
  week,
} from "./model.js";
import {
  Button,
  IconButton,
  Empty,
  Order,
  Modal,
  Confirm,
  download,
} from "./ui.jsx";
import { Graphs } from "./Graph.jsx";
import Exercises from "./Exercises.jsx";
import Settings, { Account } from "./Settings.jsx";
import { WorkoutEditor, WorkoutList, History } from "./Workouts.jsx";
const navigation = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["log", "Log Workout", Dumbbell],
  ["history", "Workout History", CalendarDays],
  ["exercises", "Exercises", Library],
  ["progress", "Progress", ChartNoAxesCombined],
  ["settings", "Settings", SettingsIcon],
];
function usePage() {
  const get = () => location.hash.slice(1) || "dashboard";
  const [page, setPage] = useState(get);
  useEffect(() => {
    const h = () => setPage(get());
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  return [
    page,
    (p) => {
      location.hash = p;
      setPage(p);
    },
  ];
}
export default function App() {
  const [session, setSession] = useState(null),
    [demoMode, setDemoMode] = useState(() => {
      try {
        return sessionStorage.getItem("iron-ledger-demo") === "true";
      } catch {
        return false;
      }
    }),
    [page, navigate] = usePage(),
    [drawer, setDrawer] = useState(false),
    [toast, setToast] = useState(""),
    [auth, setAuth] = useState(false),
    [customize, setCustomize] = useState(false),
    [selected, setSelected] = useState(null),
    [conflict, setConflict] = useState(false),
    [authLoading, setAuthLoading] = useState(!!supabase);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setToast(error.message);
      setSession(data.session);
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem("iron-ledger-demo", String(demoMode));
    } catch {}
  }, [demoMode]);
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width: 700px)").matches,
  );
  const sidebarRef = useRef();
  useEffect(() => {
    const mq = matchMedia("(max-width: 700px)"),
      change = () => setMobile(mq.matches);
    mq.addEventListener("change", change);
    return () => mq.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!mobile || !drawer) return;
    const first = sidebarRef.current?.querySelector("a");
    first?.focus();
    const key = (ev) => {
      if (ev.key === "Escape") {
        setDrawer(false);
        document.querySelector(".mobile-menu")?.focus();
      }
      if (ev.key === "Tab") {
        const items = [
            ...sidebarRef.current.querySelectorAll("a,button"),
          ].filter((el) => el.offsetParent !== null),
          i = items.indexOf(document.activeElement);
        if (ev.shiftKey && i <= 0) {
          ev.preventDefault();
          items.at(-1)?.focus();
        } else if (!ev.shiftKey && i === items.length - 1) {
          ev.preventDefault();
          items[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [mobile, drawer]);
  const mode = demoMode ? "demo" : session ? "cloud" : "local";
  const store = useMemo(
    () => new Workspace(mode, session?.user.id),
    [mode, session?.user.id],
  );
  const { state, status, error, ready, blocked } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
  );
  const update = (fn) => store.update(fn);
  useEffect(() => {
    store.init();
    const focus = () => store.refresh(),
      online = () => {
        store.flush();
        store.refresh();
      };
    window.addEventListener("focus", focus);
    window.addEventListener("online", online);
    const refreshTimer = setInterval(focus, 30000);
    return () => {
      clearInterval(refreshTimer);
      store.dispose();
      window.removeEventListener("focus", focus);
      window.removeEventListener("online", online);
    };
  }, [store]);
  useEffect(() => {
    setSelected(null);
  }, [mode, session?.user.id]);
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const theme = () =>
      (document.documentElement.dataset.theme =
        state.prefs.theme === "system"
          ? mq.matches
            ? "dark"
            : "light"
          : state.prefs.theme);
    theme();
    document.documentElement.style.setProperty("--accent", state.prefs.accent);
    mq.addEventListener("change", theme);
    return () => mq.removeEventListener("change", theme);
  }, [state.prefs.theme, state.prefs.accent]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const notify = (t) => setToast(t),
    go = (p) => {
      navigate(p);
      setDrawer(false);
    },
    open = (workoutId) => {
      setSelected(workoutId);
      go("log");
      window.scrollTo({ top: 0 });
    };
  const drafts = state.workouts
    .filter((w) => !w.finished)
    .sort((a, b) => b.date.localeCompare(a.date));
  const start = (date) => {
    const w = newWorkout();
    if (date) w.date = date;
    update((s) => ({ ...s, workouts: [...s.workouts, w] }));
    open(w.id);
  };
  const resume = () => (drafts.length ? open(drafts[0].id) : start());
  const title = navigation.find((n) => n[0] === page)?.[1] || "Dashboard";
  const finished = state.workouts
    .filter((w) => w.finished)
    .sort((a, b) => b.date.localeCompare(a.date));
  const currentWeek = week(today()),
    weekWorkouts = finished.filter(
      (w) => w.date >= currentWeek && w.date <= today(),
    ),
    prs = records(state);
  const since = new Date();
  since.setDate(since.getDate() - 27);
  const recent = finished.filter(
    (w) =>
      w.date >=
        `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-${String(since.getDate()).padStart(2, "0")}` &&
      w.date <= today(),
  );
  const names = {
    activity: "Activity overview",
    graphs: "Progress graphs",
    recent: "Recent workouts",
    records: "Personal records",
  };
  const section = (key) =>
    key === "activity" ? (
      <div className="stats-grid">
        <div className="card stat">
          <span className="stat-icon lime">
            <CalendarDays size={19} />
          </span>
          <span className="stat-label">Workouts this week</span>
          <strong>
            {weekWorkouts.length}
            <small>{weekWorkouts.length === 1 ? "session" : "sessions"}</small>
          </strong>
          <span className="muted">Since {dateLabel(currentWeek)}</span>
        </div>
        <div className="card stat">
          <span className="stat-icon violet">
            <Dumbbell size={19} />
          </span>
          <span className="stat-label">Working sets</span>
          <strong>
            {recent.reduce((a, w) => a + working(w).length, 0)}
            <small>sets</small>
          </strong>
          <span className="muted">Over the last 28 days</span>
        </div>
        <div className="card stat">
          <span className="stat-icon orange">
            <Activity size={19} />
          </span>
          <span className="stat-label">Training days</span>
          <strong>
            {new Set(recent.map((w) => w.date)).size}
            <small>days</small>
          </strong>
          <span className="muted">Over the last 28 days</span>
        </div>
        <div className="card stat">
          <span className="stat-icon blue">
            <Trophy size={19} />
          </span>
          <span className="stat-label">Lifetime workouts</span>
          <strong>
            {finished.length}
            <small>logged</small>
          </strong>
          <span className="muted">All completed workouts</span>
        </div>
      </div>
    ) : key === "graphs" ? (
      <Graphs {...{ state, update, onOpen: open }} />
    ) : key === "recent" ? (
      <div className="card recent-card">
        <div className="card-top">
          <div>
            <h3>Recent workouts</h3>
            <p>Most recently recorded workouts.</p>
          </div>
          <button className="text-button" onClick={() => go("history")}>
            View history <ArrowUpRight size={14} />
          </button>
        </div>
        <WorkoutList
          workouts={[...state.workouts].sort((a, b) =>
            b.date.localeCompare(a.date),
          )}
          state={state}
          onOpen={open}
          limit={4}
        />
      </div>
    ) : (
      <div className="card records-card">
        <div className="card-top">
          <div>
            <h3>Personal records</h3>
            <p>Best results from completed working sets.</p>
          </div>
          <Trophy size={21} className="accent" />
        </div>
        {prs.length ? (
          prs.slice(0, 4).map((r) => (
            <button
              className="record-row"
              key={r.exercise.id}
              onClick={() => open(r.workoutId)}
            >
              <span className="record-icon">
                <Trophy size={17} />
              </span>
              <span>
                <strong>{r.exercise.name}</strong>
                <small>
                  {dateLabel(r.date)} ·{" "}
                  {r.exercise.type === "bodyweight"
                    ? "Best reps"
                    : r.exercise.type === "assisted"
                      ? "Least assistance"
                      : "Heaviest set"}
                </small>
              </span>
              <strong>
                {number(r.value)} <small>{r.unit}</small>
              </strong>
              <ArrowUpRight size={16} />
            </button>
          ))
        ) : (
          <Empty title="No personal records yet">
            Your records appear as you complete working sets.
          </Empty>
        )}
      </div>
    );
  return (
    <div
      className={`app-shell ${state.prefs.collapsed ? "sidebar-collapsed" : ""}`}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {drawer && (
        <button
          className="drawer-backdrop"
          aria-label="Close navigation"
          onClick={() => setDrawer(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        inert={mobile && !drawer}
        className={`sidebar ${drawer ? "open" : ""}`}
        aria-label="Main navigation"
      >
        <a href="#dashboard" className="brand" onClick={() => go("dashboard")}>
          <span className="brand-mark">
            <Dumbbell size={23} />
          </span>
          <span className="brand-name">
            iron<span>ledger</span>
            <small>YOUR LIFTING JOURNAL</small>
          </span>
        </a>
        <span className="nav-caption">WORKSPACE</span>
        <nav>
          {navigation.map(([p, label, Icon]) => (
            <a
              href={`#${p}`}
              key={p}
              title={state.prefs.collapsed ? label : undefined}
              aria-current={page === p ? "page" : undefined}
              className={page === p ? "active" : ""}
              onClick={(ev) => {
                ev.preventDefault();
                go(p);
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
              {p === "log" && drafts.length > 0 && (
                <small>{drafts.length}</small>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-note">
            <span className="private-symbol">
              <Cloud size={19} />
            </span>
            <strong>
              {mode === "demo"
                ? "Demo workspace"
                : mode === "cloud"
                  ? "Your private workspace"
                  : "Your personal workspace"}
            </strong>
            <p>
              {mode === "cloud"
                ? "Cloud account connected."
                : "Workouts, exercises, and progress."}
            </p>
          </div>
          <button className="account-button" onClick={() => setAuth(true)}>
            <span className="avatar">
              {session?.user.email?.slice(0, 1).toUpperCase() || "IL"}
            </span>
            <span>
              <strong>{session ? "Personal account" : "On this device"}</strong>
              <small>
                {session ? "Manage account" : "Connect cloud account"}
              </small>
            </span>
            <ChevronRight size={16} />
          </button>
          <button
            className="collapse-button"
            onClick={() =>
              update((s) => ({
                ...s,
                prefs: { ...s.prefs, collapsed: !s.prefs.collapsed },
              }))
            }
          >
            {state.prefs.collapsed ? (
              <PanelLeftOpen size={17} />
            ) : (
              <>
                <PanelLeftClose size={17} />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
      <div className="main-shell" inert={mobile && drawer}>
        <header className="topbar">
          <div className="breadcrumbs">
            <IconButton
              icon={Menu}
              label="Open navigation"
              className="mobile-menu"
              onClick={() => setDrawer(true)}
            />
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{title}</strong>
          </div>
          <div className="actions">
            <span className="save-status" role="status">
              <i className={`dot ${error ? "error-dot" : ""}`} />
              {status}
            </span>
            <button
              className="unit-toggle"
              title="Switch weight units"
              onClick={() =>
                update((s) => ({
                  ...s,
                  prefs: {
                    ...s.prefs,
                    unit: s.prefs.unit === "lb" ? "kg" : "lb",
                  },
                }))
              }
            >
              {state.prefs.unit}
              <span>⇄</span>
            </button>
          </div>
        </header>
        <main id="main" tabIndex="-1">
          {mode === "demo" ? (
            <div className="mode-banner">
              <span>
                <strong>DEMO WORKSPACE</strong> · Sample data only. Your
                personal records are separate.
              </span>
              <button onClick={() => setDemoMode(false)}>
                Exit demo <X size={14} />
              </button>
            </div>
          ) : (
            mode === "local" && (
              <div className="local-notice">
                <span>
                  <Cloud size={15} />
                  Saved on this browser only. Connect an account for phone &
                  computer access.
                </span>
                <button className="text-button" onClick={() => setAuth(true)}>
                  Connect cloud <ArrowUpRight size={14} />
                </button>
                <button
                  className="text-button"
                  onClick={() => setDemoMode(true)}
                >
                  Explore demo
                </button>
              </div>
            )
          )}
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <div className="actions">
                <Button
                  onClick={() =>
                    store.conflict
                      ? setConflict(true)
                      : blocked
                        ? notify(
                            "Export a recovery copy before clearing damaged browser storage.",
                          )
                        : store.retry()
                  }
                >
                  {store.conflict ? "Resolve conflict" : "Retry"}
                </Button>
                <Button
                  icon={Download}
                  onClick={() =>
                    download(
                      `iron-ledger-recovery-${today()}.json`,
                      blocked
                        ? store.storage.getItem(store.key)
                        : JSON.stringify(state, null, 2),
                      "application/json",
                    )
                  }
                >
                  Export local copy
                </Button>
              </div>
            </div>
          )}
          {!ready || authLoading ? (
            <Empty title="Loading your workspace…">
              Retrieving your private history.
            </Empty>
          ) : blocked ? (
            <Empty title="Local recovery needs attention">
              The existing browser cache could not be validated. It has been
              preserved. Export a recovery copy and inspect browser storage
              before continuing.
            </Empty>
          ) : (
            <>
              {(!navigation.some((n) => n[0] === page) ||
                page === "dashboard") && (
                <>
                  <div className="dashboard-heading">
                    <div>
                      <span className="eyebrow">WORKOUT SUMMARY</span>
                      <h1>Dashboard</h1>
                      <p>Recent workouts and progress.</p>
                    </div>
                    <Button
                      icon={SlidersHorizontal}
                      className={customize ? "selected" : ""}
                      onClick={() => setCustomize(!customize)}
                    >
                      {customize ? "Done customizing" : "Customize"}
                    </Button>
                  </div>
                  <div className="start-card">
                    <div className="start-icon">
                      <Dumbbell size={30} />
                    </div>
                    <div>
                      <span className="eyebrow">
                        {drafts.length ? "SAVED DRAFT" : "WORKOUT LOG"}
                      </span>
                      <h2>
                        {drafts.length ? "Unfinished workout" : "New workout"}
                      </h2>
                      <p>
                        {drafts.length
                          ? `${drafts[0].name || "Untitled workout"} · ${dateLabel(drafts[0].date)} · Draft saved`
                          : "Record exercises, sets, weights, and reps."}
                      </p>
                    </div>
                    <Button
                      className="primary"
                      icon={drafts.length ? Play : Plus}
                      onClick={resume}
                    >
                      {drafts.length ? "Resume workout" : "Start workout"}
                      <ArrowUpRight size={16} />
                    </Button>
                  </div>
                  {customize && (
                    <div className="card customize">
                      <h3>Customize dashboard</h3>
                      {state.prefs.layout.map((key, i) => (
                        <div className="list-row" key={key}>
                          <label className="check-label">
                            <input
                              type="checkbox"
                              checked={!state.prefs.hidden.includes(key)}
                              onChange={() =>
                                update((s) => ({
                                  ...s,
                                  prefs: {
                                    ...s.prefs,
                                    hidden: s.prefs.hidden.includes(key)
                                      ? s.prefs.hidden.filter((k) => k !== key)
                                      : [...s.prefs.hidden, key],
                                  },
                                }))
                              }
                            />
                            {names[key]}
                          </label>
                          <Order
                            index={i}
                            total={4}
                            label={names[key]}
                            onMove={(delta) =>
                              update((s) => ({
                                ...s,
                                prefs: {
                                  ...s.prefs,
                                  layout: move(s.prefs.layout, i, delta),
                                },
                              }))
                            }
                          />
                        </div>
                      ))}
                      <Button
                        onClick={() =>
                          update((s) => ({
                            ...s,
                            prefs: {
                              ...s.prefs,
                              layout: [
                                "activity",
                                "graphs",
                                "recent",
                                "records",
                              ],
                              hidden: [],
                            },
                          }))
                        }
                      >
                        Reset layout
                      </Button>
                    </div>
                  )}
                  <div className="dashboard-sections">
                    {state.prefs.layout
                      .filter((k) => !state.prefs.hidden.includes(k))
                      .map((key) => (
                        <section
                          className={`dashboard-section section-${key}`}
                          key={key}
                        >
                          {section(key)}
                        </section>
                      ))}
                  </div>
                </>
              )}
              {page === "progress" && (
                <>
                  <div className="page-intro">
                    <span className="eyebrow">WORKOUT DATA</span>
                    <h1>Progress</h1>
                    <p>View and configure workout graphs.</p>
                  </div>
                  <Graphs {...{ state, update, onOpen: open }} />
                </>
              )}
              {page === "exercises" && (
                <Exercises {...{ state, update, onOpen: open }} />
              )}
              {page === "history" && (
                <History state={state} onOpen={open} onStart={start} />
              )}
              {page === "settings" && (
                <Settings
                  {...{ state, update, session, mode, store, notify }}
                  onDemo={() => setDemoMode(!demoMode)}
                />
              )}
              {page === "log" &&
                (selected && state.workouts.some((w) => w.id === selected) ? (
                  <WorkoutEditor
                    {...{ state, update, notify }}
                    workoutId={selected}
                    onOpen={open}
                    onClose={() => {
                      setSelected(null);
                      go("history");
                    }}
                  />
                ) : (
                  <>
                    <div className="section-heading">
                      <div>
                        <h2>Log a workout</h2>
                        <p>Create a workout or resume a saved draft.</p>
                      </div>
                      <Button
                        icon={Plus}
                        className="primary"
                        onClick={() => start()}
                      >
                        New workout
                      </Button>
                    </div>
                    {drafts.length > 0 && (
                      <div className="card">
                        <div className="card-top">
                          <h3>Unfinished workouts</h3>
                          <span className="pill">{drafts.length} drafts</span>
                        </div>
                        <WorkoutList
                          state={state}
                          workouts={drafts}
                          onOpen={open}
                        />
                      </div>
                    )}
                    <div className="card">
                      <Empty
                        title="Start with a fresh session"
                        action={
                          <Button
                            icon={Plus}
                            className="primary"
                            onClick={() => start()}
                          >
                            Start workout
                          </Button>
                        }
                      >
                        Log today or choose a past date inside the workout. No
                        program, no prescription.
                      </Empty>
                    </div>
                    {finished.length > 0 && (
                      <div className="card">
                        <div className="card-top">
                          <h3>Repeat a previous workout</h3>
                        </div>
                        {finished.slice(0, 5).map((w) => (
                          <div className="list-row" key={w.id}>
                            <span>
                              <strong>{w.name || "Untitled workout"}</strong>
                              <small className="muted">
                                {" "}
                                · {dateLabel(w.date)}
                              </small>
                            </span>
                            <Button
                              onClick={() => {
                                const fresh = copyWorkout(w);
                                update((s) => ({
                                  ...s,
                                  workouts: [...s.workouts, fresh],
                                }));
                                open(fresh.id);
                              }}
                            >
                              Repeat as new draft
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ))}
            </>
          )}
          <footer className="app-footer">
            <span>IRON LEDGER</span>
            <span>Personal lifting tracker</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <IconButton
            icon={X}
            label="Dismiss notification"
            onClick={() => setToast("")}
          />
        </div>
      )}
      {auth && (
        <Modal title="Your private workspace" onClose={() => setAuth(false)}>
          <Account
            {...{ session, mode, notify }}
            onDemo={() => {
              setDemoMode(!demoMode);
              setAuth(false);
            }}
          />
        </Modal>
      )}
      {conflict && (
        <Confirm
          title="Load the cloud version?"
          label="Export local & load cloud"
          onClose={() => setConflict(false)}
          onConfirm={() => {
            download(
              `iron-ledger-conflict-${today()}.json`,
              JSON.stringify(state, null, 2),
              "application/json",
            );
            store.reloadCloud();
          }}
        >
          Your current local workspace downloads as a backup first. The cloud
          version then replaces it on this device. Use Settings to preview a
          restore if you need the local copy.
        </Confirm>
      )}
    </div>
  );
}
