import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 8787);
const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "data", "fitness.db");
const DIST_PATH = path.join(__dirname, "..", "dist");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS workout_sessions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workout_exercises (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workout_sets (
    id TEXT PRIMARY KEY,
    exercise_id TEXT NOT NULL,
    reps INTEGER NOT NULL,
    weight REAL NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS body_metric_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    effective_from TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    weight REAL NOT NULL,
    body_fat REAL
  );
`);

const app = express();
app.use(express.json({ limit: "1mb" }));

function listSessions() {
  const sessionRows = db
    .prepare("SELECT id, date, notes FROM workout_sessions ORDER BY date DESC, created_at DESC")
    .all();
  const exerciseRows = db
    .prepare("SELECT id, session_id, name, position FROM workout_exercises ORDER BY position ASC")
    .all();
  const setRows = db
    .prepare("SELECT id, exercise_id, reps, weight, position FROM workout_sets ORDER BY position ASC")
    .all();

  const setsByExercise = new Map();
  for (const row of setRows) {
    const existing = setsByExercise.get(row.exercise_id) ?? [];
    existing.push({
      id: row.id,
      reps: row.reps,
      weight: row.weight
    });
    setsByExercise.set(row.exercise_id, existing);
  }

  const exercisesBySession = new Map();
  for (const row of exerciseRows) {
    const existing = exercisesBySession.get(row.session_id) ?? [];
    existing.push({
      id: row.id,
      name: row.name,
      sets: setsByExercise.get(row.id) ?? []
    });
    exercisesBySession.set(row.session_id, existing);
  }

  return sessionRows.map((session) => ({
    id: session.id,
    date: session.date,
    notes: session.notes,
    exercises: exercisesBySession.get(session.id) ?? []
  }));
}

function validateSessionPayload(payload) {
  if (!payload || typeof payload !== "object") return "Invalid payload.";
  if (typeof payload.id !== "string" || !payload.id.trim()) return "Session id is required.";
  if (typeof payload.date !== "string" || !payload.date.trim()) return "Session date is required.";
  if (!Array.isArray(payload.exercises) || payload.exercises.length === 0) return "At least one exercise is required.";

  const normalizedNames = new Set();
  for (const exercise of payload.exercises) {
    if (typeof exercise.id !== "string" || !exercise.id.trim()) return "Exercise id is required.";
    if (typeof exercise.name !== "string" || !exercise.name.trim()) return "Exercise name is required.";
    const key = exercise.name.trim().toLowerCase();
    if (normalizedNames.has(key)) return "Exercise names must be unique within a workout.";
    normalizedNames.add(key);

    if (!Array.isArray(exercise.sets) || exercise.sets.length === 0) return "Each exercise needs at least one set.";
    for (const set of exercise.sets) {
      if (typeof set.id !== "string" || !set.id.trim()) return "Set id is required.";
      if (!Number.isFinite(set.reps) || set.reps <= 0) return "Set reps must be greater than 0.";
      if (!Number.isFinite(set.weight) || set.weight < 0) return "Set weight must be 0 or greater.";
    }
  }

  return null;
}

const insertSession = db.transaction((payload) => {
  db.prepare("INSERT INTO workout_sessions (id, date, notes, created_at) VALUES (?, ?, ?, ?)")
    .run(payload.id, payload.date, payload.notes ?? "", new Date().toISOString());

  payload.exercises.forEach((exercise, exerciseIndex) => {
    db.prepare("INSERT INTO workout_exercises (id, session_id, name, position) VALUES (?, ?, ?, ?)")
      .run(exercise.id, payload.id, exercise.name.trim(), exerciseIndex);

    exercise.sets.forEach((set, setIndex) => {
      db.prepare("INSERT INTO workout_sets (id, exercise_id, reps, weight, position) VALUES (?, ?, ?, ?, ?)")
        .run(set.id, exercise.id, Math.round(set.reps), Number(set.weight), setIndex);
    });
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, dbPath: DB_PATH });
});

app.get("/api/workout-sessions", (_req, res) => {
  res.json(listSessions());
});

app.post("/api/workout-sessions", (req, res) => {
  const error = validateSessionPayload(req.body);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  try {
    insertSession(req.body);
    const session = listSessions().find((item) => item.id === req.body.id);
    res.status(201).json(session);
  } catch {
    res.status(500).json({ error: "Unable to save workout session." });
  }
});

app.get("/api/body-metric", (_req, res) => {
  const row = db
    .prepare("SELECT effective_from, updated_at, weight, body_fat FROM body_metric_profile WHERE id = 1")
    .get();

  if (!row) {
    res.json(null);
    return;
  }

  res.json({
    effectiveFrom: row.effective_from,
    updatedAt: row.updated_at,
    weight: row.weight,
    bodyFat: row.body_fat ?? undefined
  });
});

app.put("/api/body-metric", (req, res) => {
  const payload = req.body;
  if (
    !payload ||
    typeof payload !== "object" ||
    typeof payload.effectiveFrom !== "string" ||
    !payload.effectiveFrom.trim() ||
    !Number.isFinite(payload.weight) ||
    payload.weight <= 0
  ) {
    res.status(400).json({ error: "Invalid body metric payload." });
    return;
  }

  const updatedAt = new Date().toISOString();
  const bodyFat = Number.isFinite(payload.bodyFat) && payload.bodyFat > 0 ? Number(payload.bodyFat) : null;

  db.prepare(`
    INSERT INTO body_metric_profile (id, effective_from, updated_at, weight, body_fat)
    VALUES (1, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      effective_from = excluded.effective_from,
      updated_at = excluded.updated_at,
      weight = excluded.weight,
      body_fat = excluded.body_fat
  `).run(payload.effectiveFrom, updatedAt, Number(payload.weight), bodyFat);

  res.json({
    effectiveFrom: payload.effectiveFrom,
    updatedAt,
    weight: Number(payload.weight),
    bodyFat: bodyFat ?? undefined
  });
});

app.get("/api/exercise-library", (_req, res) => {
  const rows = db
    .prepare("SELECT DISTINCT name FROM workout_exercises WHERE TRIM(name) <> '' ORDER BY name COLLATE NOCASE ASC")
    .all();
  res.json(rows.map((row) => row.name));
});

if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      next();
      return;
    }
    res.sendFile(path.join(DIST_PATH, "index.html"));
  });
}

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Fitness tracker running on http://localhost:${PORT}`);
});
