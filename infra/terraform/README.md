# Hetzner Deployment (Terraform)

## Prerequisites

- Terraform `>= 1.5.7`
- Bitwarden CLI configured (for `./scripts/tf-hcloud.sh`)
- Existing local SSH public key (`~/.ssh/id_ed25519.pub`)

## 1) Configure Variables

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
- `ssh_public_key_path` (or `ssh_public_key`)
- `admin_ipv4_cidrs` / `admin_ipv6_cidrs` (lock SSH down to your IP)
- `app_domain` (example: `fitness.example.com`)
- `acme_email` (for Let's Encrypt)

## 2) Create/Update Infrastructure

```bash
cd /Users/biswash/Documents/repos/fitness
./scripts/tf-hcloud.sh init
./scripts/tf-hcloud.sh plan
./scripts/tf-hcloud.sh apply
./scripts/tf-hcloud.sh output
```

## 3) DNS

Create an `A` record for `app_domain` pointing to `server_ipv4` output.

## 4) Deploy App + Caddy (HTTPS)

Preferred (uses domain/email from Terraform outputs):

```bash
./scripts/deploy-hetzner-prod-from-tf.sh deploy <SERVER_IPV4> <REPO_URL> main
```

Example:

```bash
./scripts/deploy-hetzner-prod-from-tf.sh deploy 203.0.113.10 git@github.com:your-user/fitness.git main
```

Manual equivalent:

```bash
APP_DOMAIN=fitness.example.com ACME_EMAIL=you@example.com \
./scripts/deploy-hetzner.sh deploy <SERVER_IPV4> <REPO_URL> main
```

## 5) Verify

```bash
curl -I https://<app_domain>
curl -f https://<app_domain>/api/health
```

## 6) Destroy (when needed)

```bash
./scripts/tf-hcloud.sh destroy
```
