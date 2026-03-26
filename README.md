# Fitness Tracker PWA

Mobile-first fitness tracker with:
- Detailed workout sessions (exercise + sets + weight/reps)
- Compact attendance calendar
- One-time body metric profile (update only when changed)
- Backend API with SQLite persistence
- Docker deployment support

## Where Data Is Stored

Workout and body metric data is now stored in a SQLite database on the backend.

- Local run default DB path: `./data/fitness.db`
- Docker default DB path in container: `/data/fitness.db` (mounted to a named Docker volume)

## Run Locally

1. Install dependencies:
```bash
npm install
```

2. Start frontend + backend together:
```bash
npm run dev
```

3. Open:
- Web: `http://localhost:5173`
- API health: `http://localhost:8787/api/health`

Vite proxies `/api` to the backend in development.

## Production (without Docker)

```bash
npm run build
npm start
```

Open `http://localhost:8787`.

## Docker Deployment

### Option 1: Docker Compose (recommended)
```bash
docker compose up -d --build
```

Open `http://localhost:8787`.

### Docker Compose Watch (live dev)
```bash
docker compose watch
```

Then open:
- PWA dev app: `http://localhost:5173`
- API health: `http://localhost:8787/api/health`

### Option 2: Docker CLI
```bash
docker build -t fitness-tracker:local .
docker run --rm -d --name fitness-tracker -p 8787:8787 -v fitness-tracker-data:/data fitness-tracker:local
```

## iPhone Usage

1. Open the deployed URL in Safari (for local network dev, use your machine IP + port).
2. Tap Share.
3. Tap **Add to Home Screen**.

## API Summary

- `GET /api/health`
- `GET /api/workout-sessions`
- `POST /api/workout-sessions`
- `GET /api/body-metric`
- `PUT /api/body-metric`
- `GET /api/exercise-library`

## Secret Protection (Git Hook)

Enable the pre-commit hook:

```bash
./scripts/install-git-hooks.sh
```

This hook:
- runs `gitleaks` (if installed) against staged changes
- blocks commits that stage `terraform.tfvars`
- blocks commits with staged `hcloud_token = ...` patterns
