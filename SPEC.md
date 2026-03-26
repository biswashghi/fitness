# Fitness Tracker PWA Specification

## 1. Product Goal
Build a mobile-first fitness tracker that works as a Progressive Web App (PWA) on iPhone (via Safari and Add to Home Screen) and in mobile browsers.

## 2. Platform and Delivery Requirements
1. The app must be a web app implemented as a PWA.
2. The app must run in Safari on iPhone.
3. The app must support "Add to Home Screen" and launch in standalone mode.
4. The app must support offline caching for core assets via service worker.
5. The app must be responsive for phone screens and stay within width boundaries.

## 3. Navigation and Page Structure
1. The app must include at least two top-level views:
   - Dashboard view
   - Workout Log view
2. Users must be able to switch between Dashboard and Workout Log from an in-app tab/button control.

## 4. Workout Tracking Requirements
### 4.1 Detailed Workout Entry Page
1. The Workout Log view must allow creating a workout session for a selected date.
2. A workout session must support optional session notes.
3. A workout session must contain one or more exercises.
4. Each exercise must support one or more sets.
5. Each set must capture:
   - Weight
   - Reps
6. Users must be able to add and remove exercises during entry.
7. Users must be able to add and remove sets within each exercise.
8. Exercise names within a single workout session must be unique.
9. Input validation must enforce valid set values (reps > 0, weight >= 0).

### 4.2 Exercise Reuse
1. The app should maintain an exercise library from previously logged exercises.
2. Exercise entry should support selecting/reusing prior exercise names.

### 4.3 Stored Workout Model
1. Workouts must be stored as detailed sessions containing date, notes, exercises, and sets.
2. Persisted workout data must be sorted/displayed with most recent sessions first where applicable.

## 5. Calendar Requirements
1. Dashboard must show a compact month calendar (not a long vertical day list).
2. Calendar must show month title with previous/next month controls.
3. Calendar must render a 7-column weekday grid and align days correctly.
4. Each day must be marked by attendance state:
   - Went (at least one workout logged on that date)
   - Missed (past/current date with no workout)
   - Upcoming (future date)
5. Calendar UI must be compact, not overflow horizontally, and optimized for mobile viewport width.

## 6. Dashboard and Summary Requirements
1. Dashboard must summarize workout progress based on detailed sessions.
2. Summary should include counts such as workouts, exercises, sets, and streak.
3. Dashboard should include a recent workouts section summarizing latest sessions.

## 7. Body Metric Requirements
1. Body metrics must be a one-time profile model, not a running historical log.
2. The metric profile must include:
   - Effective from date
   - Weight
   - Optional body fat percentage
3. Once set, the active metric remains in effect for all future use until user explicitly updates it.
4. New metric values must only apply after user manually changes/saves the metric profile.
5. UI must show current active metric status.

## 8. Data Persistence Requirements
1. All user-entered data must persist in browser local storage.
2. The app must reload persisted data on startup.
3. The app should migrate legacy workout/metric keys into the newer data model when present.

## 9. UX and Visual Requirements
1. Interface must be mobile-first.
2. Calendar must be compact and visually scannable with clear status distinction.
3. Detailed workout entry must remain usable on small screens without overflowing width.

## 10. Out of Scope (Not Required by Current Requests)
1. User authentication/accounts.
2. Cloud sync across devices.
3. Native App Store packaging.
4. Analytics/report export.

## 11. Acceptance Criteria (High-Level)
1. User can open app on iPhone Safari and install it to Home Screen.
2. User can create detailed workout sessions with unique exercises and set-level reps/weight.
3. Dashboard calendar shows monthly attendance in compact grid form.
4. Body metric acts as a persistent profile that changes only when explicitly updated.
5. Data persists after app reload.
