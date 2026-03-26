import { FormEvent, useEffect, useMemo, useState } from "react";

type BodyMetricProfile = {
  effectiveFrom: string;
  updatedAt: string;
  weight: number;
  bodyFat?: number;
};

type WorkoutSet = {
  id: string;
  reps: number;
  weight: number;
};

type WorkoutExercise = {
  id: string;
  name: string;
  sets: WorkoutSet[];
};

type WorkoutSession = {
  id: string;
  date: string;
  notes: string;
  exercises: WorkoutExercise[];
};

type DraftSet = {
  id: string;
  reps: string;
  weight: string;
};

type DraftExercise = {
  id: string;
  name: string;
  sets: DraftSet[];
};

type DayStatus = "Went" | "Missed" | "Upcoming";

type CalendarDay = {
  isoDate: string;
  dayOfMonth: number;
  status: DayStatus;
  workoutCount: number;
};

type CalendarCell = CalendarDay | null;
type PageView = "dashboard" | "log";

const today = new Date().toISOString().slice(0, 10);
const currentMonth = today.slice(0, 7);

function shiftMonth(monthIso: string, delta: number): string {
  const [year, month] = monthIso.split("-").map(Number);
  const shifted = new Date(year, month - 1 + delta, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(monthIso: string): string {
  const [year, month] = monthIso.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
}

function createDraftSet(): DraftSet {
  return {
    id: crypto.randomUUID(),
    reps: "10",
    weight: "0"
  };
}

function createDraftExercise(name = ""): DraftExercise {
  return {
    id: crypto.randomUUID(),
    name,
    sets: [createDraftSet()]
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

async function sendJson<T>(url: string, method: "POST" | "PUT", body: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export function App() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [bodyMetric, setBodyMetric] = useState<BodyMetricProfile | null>(null);
  const [view, setView] = useState<PageView>("dashboard");
  const [loading, setLoading] = useState(true);
  const [appError, setAppError] = useState("");

  const [metricEffectiveFrom, setMetricEffectiveFrom] = useState(today);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");

  const [viewMonth, setViewMonth] = useState(currentMonth);

  const [sessionDate, setSessionDate] = useState(today);
  const [sessionNotes, setSessionNotes] = useState("");
  const [draftExercises, setDraftExercises] = useState<DraftExercise[]>([createDraftExercise()]);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      try {
        const [loadedSessions, loadedMetric] = await Promise.all([
          fetchJson<WorkoutSession[]>("/api/workout-sessions"),
          fetchJson<BodyMetricProfile | null>("/api/body-metric")
        ]);
        if (!active) return;
        setSessions(loadedSessions);
        setBodyMetric(loadedMetric);
        if (loadedMetric) {
          setMetricEffectiveFrom(loadedMetric.effectiveFrom);
          setWeight(String(loadedMetric.weight));
          setBodyFat(loadedMetric.bodyFat ? String(loadedMetric.bodyFat) : "");
        }
      } catch (error) {
        if (!active) return;
        setAppError(error instanceof Error ? error.message : "Unable to load app data.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
    const totalWorkouts = sorted.length;
    const totalExercises = sorted.reduce((sum, session) => sum + session.exercises.length, 0);
    const totalSets = sorted.reduce(
      (sum, session) => sum + session.exercises.reduce((sets, exercise) => sets + exercise.sets.length, 0),
      0
    );

    const workoutDateSet = new Set(sorted.map((w) => w.date));
    let streak = 0;
    const cursor = new Date();

    for (;;) {
      const key = cursor.toISOString().slice(0, 10);
      if (workoutDateSet.has(key)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      totalWorkouts,
      totalExercises,
      totalSets,
      streak,
      weight: bodyMetric?.weight
    };
  }, [sessions, bodyMetric]);

  const exerciseLibrary = useMemo(() => {
    const names = new Set<string>();
    sessions.forEach((session) => {
      session.exercises.forEach((exercise) => names.add(exercise.name.trim()));
    });
    return Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [sessions]);

  const calendarCells = useMemo<CalendarCell[]>(() => {
    const [year, month] = viewMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();

    const workoutsByDate = sessions.reduce<Map<string, WorkoutSession[]>>((acc, session) => {
      const list = acc.get(session.date) ?? [];
      list.push(session);
      acc.set(session.date, list);
      return acc;
    }, new Map());

    const cells: CalendarCell[] = [];
    for (let day = 0; day < firstDay; day += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const isoDate = `${viewMonth}-${String(day).padStart(2, "0")}`;
      const entries = workoutsByDate.get(isoDate) ?? [];
      const workoutCount = entries.length;

      let status: DayStatus = "Missed";
      if (isoDate > today) {
        status = "Upcoming";
      } else if (workoutCount > 0) {
        status = "Went";
      }

      cells.push({
        isoDate,
        dayOfMonth: day,
        status,
        workoutCount
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [sessions, viewMonth]);

  async function saveBodyMetric(e: FormEvent) {
    e.preventDefault();
    const parsedWeight = Number(weight);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) return;
    const parsedBodyFat = Number(bodyFat);

    try {
      const saved = await sendJson<BodyMetricProfile>("/api/body-metric", "PUT", {
        effectiveFrom: metricEffectiveFrom,
        weight: parsedWeight,
        bodyFat: Number.isFinite(parsedBodyFat) && parsedBodyFat > 0 ? parsedBodyFat : undefined
      });
      setBodyMetric(saved);
      setAppError("");
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Unable to save body metric.");
    }
  }

  function addExercise() {
    setDraftExercises((current) => [...current, createDraftExercise()]);
  }

  function removeExercise(exerciseId: string) {
    setDraftExercises((current) => {
      if (current.length === 1) return current;
      return current.filter((exercise) => exercise.id !== exerciseId);
    });
  }

  function updateExerciseName(exerciseId: string, name: string) {
    setDraftExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              name
            }
          : exercise
      )
    );
  }

  function addSet(exerciseId: string) {
    setDraftExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: [...exercise.sets, createDraftSet()]
            }
          : exercise
      )
    );
  }

  function removeSet(exerciseId: string, setId: string) {
    setDraftExercises((current) =>
      current.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;
        if (exercise.sets.length === 1) return exercise;
        return {
          ...exercise,
          sets: exercise.sets.filter((set) => set.id !== setId)
        };
      })
    );
  }

  function updateSet(exerciseId: string, setId: string, field: "reps" | "weight", value: string) {
    setDraftExercises((current) =>
      current.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;
        return {
          ...exercise,
          sets: exercise.sets.map((set) =>
            set.id === setId
              ? {
                  ...set,
                  [field]: value
                }
              : set
          )
        };
      })
    );
  }

  async function saveDetailedWorkout(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    const trimmedNames = draftExercises.map((exercise) => exercise.name.trim().toLowerCase());
    const uniqueCount = new Set(trimmedNames.filter(Boolean)).size;
    if (uniqueCount !== draftExercises.length) {
      setFormError("Each exercise should be unique within a workout.");
      return;
    }

    const parsedExercises: WorkoutExercise[] = [];
    for (const exercise of draftExercises) {
      const name = exercise.name.trim();
      if (!name) {
        setFormError("Give each exercise a name before saving.");
        return;
      }

      const parsedSets: WorkoutSet[] = [];
      for (const set of exercise.sets) {
        const reps = Number(set.reps);
        const setWeight = Number(set.weight);
        if (!Number.isFinite(reps) || reps <= 0 || !Number.isFinite(setWeight) || setWeight < 0) {
          setFormError("Every set needs valid reps (>0) and weight (>=0).");
          return;
        }
        parsedSets.push({
          id: crypto.randomUUID(),
          reps,
          weight: setWeight
        });
      }

      parsedExercises.push({
        id: crypto.randomUUID(),
        name,
        sets: parsedSets
      });
    }

    const payload: WorkoutSession = {
      id: crypto.randomUUID(),
      date: sessionDate,
      notes: sessionNotes.trim(),
      exercises: parsedExercises
    };

    try {
      const saved = await sendJson<WorkoutSession>("/api/workout-sessions", "POST", payload);
      setSessions((current) => [saved, ...current].sort((a, b) => b.date.localeCompare(a.date)));
      setSessionNotes("");
      setDraftExercises([createDraftExercise(exerciseLibrary[0] ?? "")]);
      setView("dashboard");
      setAppError("");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save workout.");
    }
  }

  if (loading) {
    return (
      <main className="app">
        <section className="panel">
          <h2>Loading...</h2>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <section className="hero">
        <h1>Fitness Tracker</h1>
        <p>Log workouts and body metrics from your phone.</p>
      </section>

      {appError && (
        <section className="panel">
          <p className="error">{appError}</p>
        </section>
      )}

      <section className="page-tabs" aria-label="pages">
        <button type="button" className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>
          Dashboard
        </button>
        <button type="button" className={view === "log" ? "active" : ""} onClick={() => setView("log")}>
          Workout Log
        </button>
      </section>

      {view === "dashboard" ? (
        <>
          <section className="stats">
            <article>
              <span>Workouts</span>
              <strong>{stats.totalWorkouts}</strong>
            </article>
            <article>
              <span>Exercises</span>
              <strong>{stats.totalExercises}</strong>
            </article>
            <article>
              <span>Sets</span>
              <strong>{stats.totalSets}</strong>
            </article>
            <article>
              <span>Streak</span>
              <strong>{stats.streak}d</strong>
            </article>
            <article>
              <span>Current Weight</span>
              <strong>{stats.weight ? `${stats.weight} lb` : "--"}</strong>
            </article>
          </section>

          <section className="panel calendar">
            <div className="calendar-header">
              <h2>Gym Calendar</h2>
              <div className="calendar-controls">
                <button type="button" onClick={() => setViewMonth((month) => shiftMonth(month, -1))}>
                  Prev
                </button>
                <strong>{monthLabel(viewMonth)}</strong>
                <button
                  type="button"
                  onClick={() => setViewMonth((month) => shiftMonth(month, 1))}
                  disabled={viewMonth >= currentMonth}
                >
                  Next
                </button>
              </div>
            </div>

            <div className="calendar-weekdays">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>

            <div className="calendar-grid">
              {calendarCells.map((day, index) =>
                day ? (
                  <button
                    key={day.isoDate}
                    type="button"
                    className={`calendar-cell ${day.status.toLowerCase()}`}
                    title={`${day.isoDate}: ${day.status}${day.workoutCount > 0 ? ` (${day.workoutCount} workout${day.workoutCount > 1 ? "s" : ""})` : ""}`}
                  >
                    <span className="day">{day.dayOfMonth}</span>
                    <span className="dot" aria-hidden="true" />
                  </button>
                ) : (
                  <span key={`empty-${index}`} className="calendar-cell empty" aria-hidden="true" />
                )
              )}
            </div>

            <div className="calendar-legend">
              <span><i className="swatch went" /> Went</span>
              <span><i className="swatch missed" /> Missed</span>
              <span><i className="swatch upcoming" /> Upcoming</span>
            </div>
          </section>

          <section className="panel">
            <h2>Body Metric Profile</h2>
            <form onSubmit={saveBodyMetric}>
              <label>
                Effective From
                <input
                  type="date"
                  value={metricEffectiveFrom}
                  onChange={(e) => setMetricEffectiveFrom(e.target.value)}
                  required
                />
              </label>
              <label>
                Weight (lb)
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                />
              </label>
              <label>
                Body Fat % (optional)
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                />
              </label>
              <button type="submit">{bodyMetric ? "Update Metric Profile" : "Set Metric Profile"}</button>
            </form>
            {bodyMetric ? (
              <p className="metric-note">
                Active metric: {bodyMetric.weight} lb
                {bodyMetric.bodyFat ? ` • ${bodyMetric.bodyFat}% body fat` : ""}
                {` • effective from ${bodyMetric.effectiveFrom}`}
              </p>
            ) : (
              <p className="metric-note">No active body metric yet. Set it once, then update only when needed.</p>
            )}
          </section>

          <section className="panel list">
            <h2>Recent Workouts</h2>
            <ul>
              {sessions.slice(0, 6).map((session) => {
                const setCount = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
                return (
                  <li key={session.id}>
                    <div>
                      <strong>{session.date}</strong>
                      <span>{session.exercises.length} exercises</span>
                    </div>
                    <p>{setCount} sets{session.notes ? ` • ${session.notes}` : ""}</p>
                  </li>
                );
              })}
              {!sessions.length && <li className="empty">No workouts yet.</li>}
            </ul>
          </section>
        </>
      ) : (
        <section className="panel">
          <h2>Detailed Workout Entry</h2>
          <form onSubmit={saveDetailedWorkout}>
            <label>
              Workout Date
              <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} required />
            </label>
            <label>
              Session Notes (optional)
              <textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="How did the workout feel?"
              />
            </label>

            <div className="exercise-list">
              {draftExercises.map((exercise, exerciseIndex) => (
                <article key={exercise.id} className="exercise-card">
                  <div className="exercise-head">
                    <h3>Exercise {exerciseIndex + 1}</h3>
                    <button type="button" className="plain" onClick={() => removeExercise(exercise.id)}>
                      Remove
                    </button>
                  </div>

                  <label>
                    Exercise Name
                    <input
                      value={exercise.name}
                      onChange={(e) => updateExerciseName(exercise.id, e.target.value)}
                      list="exercise-library"
                      placeholder="Bench Press"
                      required
                    />
                  </label>

                  <div className="set-table">
                    <div className="set-row header">
                      <span>Set</span>
                      <span>Weight</span>
                      <span>Reps</span>
                      <span />
                    </div>
                    {exercise.sets.map((set, setIndex) => (
                      <div key={set.id} className="set-row">
                        <span>{setIndex + 1}</span>
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          value={set.weight}
                          onChange={(e) => updateSet(exercise.id, set.id, "weight", e.target.value)}
                          inputMode="decimal"
                          required
                        />
                        <input
                          type="number"
                          step="1"
                          min={1}
                          value={set.reps}
                          onChange={(e) => updateSet(exercise.id, set.id, "reps", e.target.value)}
                          inputMode="numeric"
                          required
                        />
                        <button type="button" className="plain" onClick={() => removeSet(exercise.id, set.id)}>
                          X
                        </button>
                      </div>
                    ))}
                  </div>

                  <button type="button" className="secondary" onClick={() => addSet(exercise.id)}>
                    + Add Set
                  </button>
                </article>
              ))}
            </div>

            {formError && <p className="error">{formError}</p>}

            <div className="action-row">
              <button type="button" className="secondary" onClick={addExercise}>
                + Add Exercise
              </button>
              <button type="submit">Save Workout Session</button>
            </div>
          </form>

          {exerciseLibrary.length > 0 && (
            <>
              <h3 className="subhead">Exercise Library</h3>
              <p className="metric-note">{exerciseLibrary.join(" • ")}</p>
              <datalist id="exercise-library">
                {exerciseLibrary.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </>
          )}
        </section>
      )}
    </main>
  );
}
