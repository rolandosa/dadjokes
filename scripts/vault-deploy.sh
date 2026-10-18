#!/usr/bin/env bash
# Deploys the Dad-O-Matic 3000 to a Vault: object + picklist + page + tab (MDL), then the client code.
#
#   VAULT_HOST=myvault.veevavault.com VAULT_SESSION=<session id> ./scripts/deploy.sh
#
# VAULT_SESSION may be omitted when a proxy already authenticates requests to VAULT_HOST.
set -euo pipefail

: "${VAULT_HOST:?Set VAULT_HOST, e.g. myvault.veevavault.com}"
API="https://${VAULT_HOST}/api"
VERSION="${VAULT_API_VERSION:-v25.2}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AUTH=()
[[ -n "${VAULT_SESSION:-}" ]] && AUTH=(-H "Authorization: ${VAULT_SESSION}")

check() {
  if ! grep -q '"responseStatus" *: *"SUCCESS"' <<<"$1"; then
    echo "FAILED: $1" >&2
    exit 1
  fi
}

echo "▶ Building client code"
(cd "$ROOT" && pnpm install --frozen-lockfile --silent && pnpm --filter @dadjokes/vault run -s package)

# The Page component references the distribution, so upload the code first.
echo "▶ Uploading client distribution dad_jokes__c"
out=$(curl -sS "${AUTH[@]}" -F "file=@${ROOT}/packages/vault/dad-jokes.zip" "${API}/${VERSION}/uicode/distributions")
check "$out"

echo "▶ Running MDL (picklist, object, page, tab)"
# MDL execute runs one command per call most reliably; split on the blank line between commands.
tmp=$(mktemp -d)
awk -v RS= -v dir="$tmp" '{print > sprintf("%s/mdl_%02d.txt", dir, NR)}' "$ROOT/mdl/dad_jokes.mdl"
for f in "$tmp"/mdl_*.txt; do
  name=$(head -1 "$f")
  out=$(curl -sS "${AUTH[@]}" -H "Content-Type: text/plain" --data-binary "@$f" "${API}/mdl/execute")
  check "$out"
  echo "   ✓ ${name% (}"
done

echo "✅ Done. Open https://${VAULT_HOST}/ui/#custom/page/dad-jokes"
echo "   Users other than Vault Owners need View on the page and tab, and CRUD on Dad Joke, via a permission set."
