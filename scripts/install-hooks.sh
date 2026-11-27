#!/usr/bin/env bash
set -euo pipefail
HOOK=".git/hooks/pre-commit"
cat > "$HOOK" << 'EOF'
#!/usr/bin/env bash
# Gitleaks pre-commit hook — blocks commits containing secrets
if ! command -v gitleaks &>/dev/null; then
  echo "⚠️  gitleaks not installed — skipping secret scan (brew install gitleaks)"
  exit 0
fi
gitleaks protect --staged --redact -v
EOF
chmod +x "$HOOK"
echo "✅ Pre-commit hook installed"
