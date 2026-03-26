#!/usr/bin/env bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "git not found"
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Run this script from inside your git repository."
  exit 1
fi

git config core.hooksPath .githooks
echo "Installed git hooks path: .githooks"
echo "Pre-commit hook is now active."
echo "Tip: install gitleaks for full scanning: https://github.com/gitleaks/gitleaks"
