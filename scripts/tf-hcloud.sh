#!/usr/bin/env bash
set -euo pipefail

if ! command -v bw >/dev/null 2>&1; then
  echo "Bitwarden CLI (bw) is required."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required."
  exit 1
fi

if ! command -v terraform >/dev/null 2>&1; then
  echo "terraform is required."
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <terraform-args...>"
  echo "Examples:"
  echo "  $0 plan"
  echo "  $0 apply"
  echo "  $0 destroy"
  exit 1
fi

ITEM_NAME="${BW_HCLOUD_ITEM_NAME:-hetzner-hcloud-token}"
FIELD_NAME="${BW_HCLOUD_FIELD_NAME:-token}"
TF_DIR="${TF_DIR:-infra/terraform}"
SESSION_FILE="${BW_SESSION_FILE:-/tmp/bw-session-${UID}}"
AUTO_LOCK="${BW_AUTO_LOCK:-0}"

if [[ ! -d "$TF_DIR" ]]; then
  echo "Terraform dir not found: $TF_DIR"
  exit 1
fi

is_valid_session() {
  local session="$1"
  bw sync --session "$session" >/dev/null 2>&1
}

BW_SESSION_VALUE="${BW_SESSION:-}"

if [[ -z "$BW_SESSION_VALUE" && -f "$SESSION_FILE" ]]; then
  BW_SESSION_VALUE="$(tr -d '\r\n' < "$SESSION_FILE")"
  if ! is_valid_session "$BW_SESSION_VALUE"; then
    BW_SESSION_VALUE=""
  fi
fi

if [[ -z "$BW_SESSION_VALUE" ]]; then
  BW_SESSION_VALUE="$(bw unlock --raw)"
  umask 177
  printf '%s' "$BW_SESSION_VALUE" > "$SESSION_FILE"
fi

cleanup() {
  if [[ "$AUTO_LOCK" == "1" ]]; then
    bw lock >/dev/null 2>&1 || true
    rm -f "$SESSION_FILE" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

TOKEN="$(
  bw get item "$ITEM_NAME" --session "$BW_SESSION_VALUE" \
    | jq -r --arg field "$FIELD_NAME" '.fields[]? | select((.name|ascii_downcase)==($field|ascii_downcase)) | .value' \
    | tr -d '\r\n[:space:]'
)"

if [[ -z "$TOKEN" ]]; then
  echo "Could not find token field '$FIELD_NAME' on Bitwarden item '$ITEM_NAME'."
  exit 1
fi

if [[ ${#TOKEN} -ne 64 ]]; then
  echo "Token length is ${#TOKEN}, expected 64."
  exit 1
fi

(
  cd "$TF_DIR"
  HCLOUD_TOKEN="$TOKEN" terraform "$@"
)
