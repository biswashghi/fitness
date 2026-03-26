# Hetzner Deployment (Terraform)

## Prerequisites

- Terraform `>= 1.6`
- Hetzner Cloud API token
- Existing local SSH public key (`~/.ssh/id_ed25519.pub`)

## 1) Configure Variables

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
- `ssh_public_key`
- `admin_ipv4_cidrs` / `admin_ipv6_cidrs` (lock SSH down to your IP)
- Optional server sizing/location values

Set your token at runtime (recommended via Bitwarden helper script):

```bash
cd /Users/biswash/Documents/repos/fitness
./scripts/tf-hcloud.sh plan
./scripts/tf-hcloud.sh apply
```

This script:
- unlocks Bitwarden (if needed),
- reads `token` from item `hetzner-hcloud-token`,
- injects `HCLOUD_TOKEN` only for that Terraform command.

## 2) Create Infrastructure

```bash
terraform init
./scripts/tf-hcloud.sh plan
./scripts/tf-hcloud.sh apply
```

Get outputs:

```bash
terraform output
```

You will receive:
- `server_ipv4`
- `deploy_user`

## 3) Deploy the Fitness App

From repo root:

```bash
./scripts/deploy-hetzner.sh deploy <SERVER_IPV4> <REPO_URL> main
```

Example:

```bash
./scripts/deploy-hetzner.sh deploy 203.0.113.10 git@github.com:your-user/fitness.git main
```

## 4) Verify

```bash
ssh deploy@<SERVER_IPV4>
cd /opt/fitness-tracker
docker compose ps
curl -f http://localhost:8787/api/health
```

If your firewall allows port 8787 publicly, test:

```bash
curl -f http://<SERVER_IPV4>:8787/api/health
```

## 5) Destroy (when needed)

```bash
cd infra/terraform
terraform destroy
```
