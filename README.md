# Fitness Tracker

Mobile-first fitness tracker (PWA UI + Node API + SQLite) with:
- detailed workouts (exercise/sets/reps/weight)
- body metric profile
- Docker production deploy behind Caddy (HTTPS)
- Hetzner infrastructure via Terraform

## Architecture

- Frontend + API served by `server/index.js` on port `8787`
- SQLite DB at `/data/fitness.db` in container
- Production reverse proxy: Caddy on `80/443`

## Local Development

1. Install deps

```bash
npm install
```

2. Run app (UI + API)

```bash
npm run dev
```

3. Open
- UI: `http://localhost:5173`
- API health: `http://localhost:8787/api/health`

## Local Production Build Check

```bash
npm run build
npm start
curl -f http://localhost:8787/api/health
```

## End-to-End UI Tests

Install Playwright browser once:

```bash
npm run test:e2e:install
```

Run headless E2E tests:

```bash
npm run test:e2e
```

## Hetzner Production Deployment (Terraform + Docker + DNS)

Start deployment from:
- [/Users/biswash/Documents/repos/hetzner_tf/README.md](/Users/biswash/Documents/repos/hetzner_tf/README.md)

Come back here for Fitness-specific runtime and operational notes.

## Operational Notes

- Terraform firewall is production-oriented (`22/80/443`).
- Direct access to `:5173/:8787` is for temporary debugging only.
- If system says `*** System restart required ***`, reboot after deployment:

```bash
ssh deploy@<SERVER_IPV4>
sudo reboot
```

## Secret Handling

- Hetzner token is fetched from Bitwarden only when needed (`hetzner_tf/scripts/tf-hcloud.sh`).
- Enable pre-commit secret checks:

```bash
./scripts/install-git-hooks.sh
```

Hook + gitleaks config will block common hardcoded token/session patterns.

## Useful Scripts

- Hetzner deploy: [`scripts/deploy-hetzner.sh`](/Users/biswash/Documents/repos/fitness/scripts/deploy-hetzner.sh)
- Hetzner deploy from Terraform outputs: [`hetzner_tf/scripts/deploy-hetzner-prod-from-tf.sh`](/Users/biswash/Documents/repos/hetzner_tf/scripts/deploy-hetzner-prod-from-tf.sh)
- Terraform wrapper: [`hetzner_tf/scripts/tf-hcloud.sh`](/Users/biswash/Documents/repos/hetzner_tf/scripts/tf-hcloud.sh)

## Reusable Deployment Template

- Hetzner + Terraform + DNS template writeup:
  [/Users/biswash/Documents/repos/hetzner_tf/shared/HETZNER_TERRAFORM_DNS_TEMPLATE.md](/Users/biswash/Documents/repos/hetzner_tf/shared/HETZNER_TERRAFORM_DNS_TEMPLATE.md)
