#!/usr/bin/env bash
# Send a checkout.session.completed test event to your Stripe webhook endpoint
# and report whether it was processed — using an admin-only edge function
# (no service-role key required).
#
# Prerequisites:
#   1. Install the Stripe CLI:  https://stripe.com/docs/stripe-cli
#   2. Log in (test mode):      stripe login
#   3. Create a .env with:
#         SUPABASE_URL=https://<your-project-ref>.supabase.co
#         SUPABASE_ANON_KEY=eyJhbGci...            # publishable/anon key
#         STRIPE_ENDPOINT=https://<ref>.supabase.co/functions/v1/stripe-webhook
#         ADMIN_EMAIL=you@example.com              # a user with the 'admin' role
#         ADMIN_PASSWORD=•••••••••••
#
# Usage:
#   ./trigger-webhook-test.sh
#   ./trigger-webhook-test.sh --env-file path/to/.env
#   ./trigger-webhook-test.sh --endpoint https://.../stripe-webhook

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ENV_FILE=""
ENDPOINT_OVERRIDE=""
POLL_TIMEOUT_SEC=30
POLL_INTERVAL_SEC=2

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file) ENV_FILE="$2"; shift 2 ;;
    --endpoint) ENDPOINT_OVERRIDE="$2"; shift 2 ;;
    --timeout)  POLL_TIMEOUT_SEC="$2"; shift 2 ;;
    -h|--help)  grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

# Locate .env
if [[ -z "$ENV_FILE" ]]; then
  if   [[ -f "$SCRIPT_DIR/.env" ]]; then ENV_FILE="$SCRIPT_DIR/.env"
  elif [[ -f "$REPO_ROOT/.env"  ]]; then ENV_FILE="$REPO_ROOT/.env"
  fi
fi
if [[ -z "$ENV_FILE" || ! -f "$ENV_FILE" ]]; then
  echo "FAIL: no .env file found (scripts/.env or repo-root .env)." >&2
  exit 2
fi

echo "==> Loading env from $ENV_FILE"
# Whitelist-parse KEY=VALUE lines; do not source arbitrary shell.
while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
  key="${key%"${key##*[![:space:]]}"}"; key="${key#"${key%%[![:space:]]*}"}"
  [[ -z "$key" ]] && continue
  value="${value%$'\r'}"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  case "$key" in
    SUPABASE_URL|SUPABASE_ANON_KEY|STRIPE_ENDPOINT|ADMIN_EMAIL|ADMIN_PASSWORD)
      export "$key=$value" ;;
  esac
done < "$ENV_FILE"

[[ -n "$ENDPOINT_OVERRIDE" ]] && STRIPE_ENDPOINT="$ENDPOINT_OVERRIDE"

command -v stripe >/dev/null || { echo "FAIL: Stripe CLI not found." >&2; exit 1; }
command -v curl   >/dev/null || { echo "FAIL: curl is required." >&2; exit 1; }
command -v jq     >/dev/null || { echo "FAIL: jq is required (brew install jq)." >&2; exit 1; }

missing=()
[[ -z "${SUPABASE_URL:-}"      ]] && missing+=("SUPABASE_URL")
[[ -z "${SUPABASE_ANON_KEY:-}" ]] && missing+=("SUPABASE_ANON_KEY")
[[ -z "${STRIPE_ENDPOINT:-}"   ]] && missing+=("STRIPE_ENDPOINT")
[[ -z "${ADMIN_EMAIL:-}"       ]] && missing+=("ADMIN_EMAIL")
[[ -z "${ADMIN_PASSWORD:-}"    ]] && missing+=("ADMIN_PASSWORD")
if (( ${#missing[@]} > 0 )); then
  echo "FAIL: missing env vars in $ENV_FILE: ${missing[*]}" >&2
  exit 2
fi

# --- 1. Admin login via GoTrue -----------------------------------------------
echo "==> Signing in as $ADMIN_EMAIL"
LOGIN_RESP=$(curl -sS -X POST \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  --data "$(jq -nc --arg e "$ADMIN_EMAIL" --arg p "$ADMIN_PASSWORD" \
             '{email:$e, password:$p}')" \
  "${SUPABASE_URL}/auth/v1/token?grant_type=password")

ACCESS_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.access_token // empty')
if [[ -z "$ACCESS_TOKEN" ]]; then
  echo "FAIL: admin login failed: $(echo "$LOGIN_RESP" | jq -c '.')" >&2
  exit 3
fi

# --- 2. Trigger Stripe event -------------------------------------------------
echo "==> Triggering checkout.session.completed via Stripe CLI (test mode)..."
stripe trigger checkout.session.completed >/dev/null
sleep 2
EVENT_ID=$(stripe events list --limit 1 --type checkout.session.completed \
  | jq -r '.data[0].id')
[[ -z "$EVENT_ID" || "$EVENT_ID" == "null" ]] && { echo "FAIL: no event id returned" >&2; exit 3; }
echo "==> Stripe event: $EVENT_ID"

if [[ -n "${STRIPE_ENDPOINT:-}" ]]; then
  echo "==> Resending event to $STRIPE_ENDPOINT ..."
  stripe events resend "$EVENT_ID" --webhook-endpoint "$STRIPE_ENDPOINT" >/dev/null || true
fi

# --- 3. Poll admin edge function --------------------------------------------
CHECK_URL="${SUPABASE_URL}/functions/v1/check-webhook-event?event_id=${EVENT_ID}"
echo "==> Polling check-webhook-event (timeout ${POLL_TIMEOUT_SEC}s)..."
DEADLINE=$(( $(date +%s) + POLL_TIMEOUT_SEC ))
BODY=""; HTTP_CODE=""
while (( $(date +%s) < DEADLINE )); do
  RESP=$(curl -sS -w '\n%{http_code}' \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    "$CHECK_URL")
  HTTP_CODE="${RESP##*$'\n'}"
  BODY="${RESP%$'\n'*}"
  if [[ "$HTTP_CODE" == "200" ]]; then break; fi
  sleep "$POLL_INTERVAL_SEC"
done

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "FAIL: check-webhook-event returned $HTTP_CODE" >&2
  echo "$BODY" >&2
  exit 4
fi

STATUS=$(echo   "$BODY" | jq -r '.status')
ERR=$(echo      "$BODY" | jq -r '.error_message // ""')
CREATED=$(echo  "$BODY" | jq -r '.created_at')

echo
echo "==> Result"
echo "     event_id:   $EVENT_ID"
echo "     status:     $STATUS"
echo "     created_at: $CREATED"
[[ -n "$ERR" ]] && echo "     error:      $ERR"

if [[ "$STATUS" == "processed" ]]; then
  echo "PASS: webhook processed."
  exit 0
fi
echo "FAIL: webhook status is '$STATUS'." >&2
exit 5
