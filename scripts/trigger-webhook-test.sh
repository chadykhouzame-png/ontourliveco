#!/usr/bin/env bash
# Send a checkout.session.completed test event to your Stripe webhook endpoint
# and report whether it was processed.
#
# Prerequisites:
#   1. Install the Stripe CLI:  https://stripe.com/docs/stripe-cli
#   2. Log in (test mode):      stripe login
#   3. Create a .env file next to this script (or in the repo root) with:
#         SUPABASE_URL=https://<your-project-ref>.supabase.co
#         SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...       # from Cloud → Secrets
#         STRIPE_ENDPOINT=https://<ref>.supabase.co/functions/v1/stripe-webhook
#
# Usage:
#   ./trigger-webhook-test.sh
#   ./trigger-webhook-test.sh --env-file path/to/.env
#   ./trigger-webhook-test.sh --endpoint https://.../stripe-webhook   # overrides STRIPE_ENDPOINT

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
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

# Resolve .env: explicit flag > scripts/.env > repo-root .env
if [[ -z "$ENV_FILE" ]]; then
  if   [[ -f "$SCRIPT_DIR/.env" ]]; then ENV_FILE="$SCRIPT_DIR/.env"
  elif [[ -f "$REPO_ROOT/.env"  ]]; then ENV_FILE="$REPO_ROOT/.env"
  fi
fi

if [[ -z "$ENV_FILE" || ! -f "$ENV_FILE" ]]; then
  echo "FAIL: no .env file found. Looked for scripts/.env and repo-root .env." >&2
  echo "      Create one with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_ENDPOINT." >&2
  exit 2
fi

echo "==> Loading env from $ENV_FILE"
# Load KEY=VALUE lines without executing arbitrary shell in the .env file.
while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
  key="${key%"${key##*[![:space:]]}"}"; key="${key#"${key%%[![:space:]]*}"}"
  [[ -z "$key" ]] && continue
  # Strip surrounding quotes and trailing CR (Windows line endings)
  value="${value%$'\r'}"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  # Only export the three keys we care about; ignore everything else.
  case "$key" in
    SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|STRIPE_ENDPOINT)
      export "$key=$value" ;;
  esac
done < "$ENV_FILE"

[[ -n "$ENDPOINT_OVERRIDE" ]] && STRIPE_ENDPOINT="$ENDPOINT_OVERRIDE"

command -v stripe >/dev/null || { echo "FAIL: Stripe CLI not found. Install: https://stripe.com/docs/stripe-cli" >&2; exit 1; }
command -v curl   >/dev/null || { echo "FAIL: curl is required" >&2; exit 1; }
command -v jq     >/dev/null || { echo "FAIL: jq is required (brew install jq)" >&2; exit 1; }

missing=()
[[ -z "${SUPABASE_URL:-}"              ]] && missing+=("SUPABASE_URL")
[[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]] && missing+=("SUPABASE_SERVICE_ROLE_KEY")
[[ -z "${STRIPE_ENDPOINT:-}"           ]] && missing+=("STRIPE_ENDPOINT")
if (( ${#missing[@]} > 0 )); then
  echo "FAIL: missing required env vars in $ENV_FILE: ${missing[*]}" >&2
  exit 2
fi

ENDPOINT_URL="$STRIPE_ENDPOINT"

echo "==> Triggering checkout.session.completed via Stripe CLI (test mode)..."
TRIGGER_OUT=$(stripe trigger checkout.session.completed 2>&1)
echo "$TRIGGER_OUT"

# Stripe CLI prints something like:
#   Setting up fixture for: checkout_session
#   Trigger succeeded! Check dashboard for event details.
# The event ID isn't returned, so we grab the most recent one from the API.
sleep 2
EVENT_ID=$(stripe events list --limit 1 --type checkout.session.completed \
  | jq -r '.data[0].id')

if [[ -z "$EVENT_ID" || "$EVENT_ID" == "null" ]]; then
  echo "Could not resolve the Stripe event ID. Check 'stripe events list'." >&2
  exit 1
fi
echo "==> Stripe event: $EVENT_ID"

# Optional: manually POST to a specific endpoint (bypasses configured webhooks).
if [[ -n "$ENDPOINT_URL" ]]; then
  echo "==> Resending event to $ENDPOINT_URL ..."
  stripe events resend "$EVENT_ID" --webhook-endpoint "$ENDPOINT_URL" || true
fi

REST="${SUPABASE_URL}/rest/v1/webhook_events"
AUTH=( -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" )

echo "==> Polling webhook_events for event id=$EVENT_ID (timeout ${POLL_TIMEOUT_SEC}s)..."
DEADLINE=$(( $(date +%s) + POLL_TIMEOUT_SEC ))
ROW=""
while (( $(date +%s) < DEADLINE )); do
  ROW=$(curl -sS "${AUTH[@]}" \
    "${REST}?select=id,event_type,status,error_message,created_at&stripe_event_id=eq.${EVENT_ID}")
  COUNT=$(echo "$ROW" | jq 'length')
  if [[ "$COUNT" != "0" ]]; then break; fi
  sleep "$POLL_INTERVAL_SEC"
done

if [[ -z "$ROW" || "$(echo "$ROW" | jq 'length')" == "0" ]]; then
  echo "FAIL: no row in webhook_events for $EVENT_ID after ${POLL_TIMEOUT_SEC}s." >&2
  echo "      Check that the endpoint is registered in Stripe and STRIPE_WEBHOOK_SECRET matches." >&2
  exit 3
fi

STATUS=$(echo "$ROW" | jq -r '.[0].status')
ERR=$(echo    "$ROW" | jq -r '.[0].error_message // ""')
CREATED=$(echo "$ROW" | jq -r '.[0].created_at')

echo
echo "==> Result"
echo "     event_id:   $EVENT_ID"
echo "     status:     $STATUS"
echo "     created_at: $CREATED"
[[ -n "$ERR" ]] && echo "     error:      $ERR"

if [[ "$STATUS" == "processed" ]]; then
  echo "PASS: webhook processed."
  exit 0
else
  echo "FAIL: webhook status is '$STATUS'." >&2
  exit 4
fi
