#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <deploy-user> <server-ip> <repo-url> [branch]"
  exit 1
fi

DEPLOY_USER="$1"
SERVER_IP="$2"
REPO_URL="$3"
BRANCH="${4:-main}"

TF_DIR="${TF_DIR:-infra/terraform}"

if [[ ! -d "$TF_DIR" ]]; then
  echo "Terraform dir not found: $TF_DIR"
  exit 1
fi

APP_DOMAIN="$(cd "$TF_DIR" && terraform output -raw app_domain 2>/dev/null || true)"
ACME_EMAIL="$(cd "$TF_DIR" && terraform output -raw acme_email 2>/dev/null || true)"

if [[ -z "$APP_DOMAIN" || "$APP_DOMAIN" == "example.com" ]]; then
  echo "Terraform output app_domain is empty/default. Set a real domain in infra/terraform/terraform.tfvars and apply."
  exit 1
fi

APP_DOMAIN="$APP_DOMAIN" ACME_EMAIL="$ACME_EMAIL" \
  ./scripts/deploy-hetzner.sh "$DEPLOY_USER" "$SERVER_IP" "$REPO_URL" "$BRANCH"
