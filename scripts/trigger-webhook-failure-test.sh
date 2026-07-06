#!/usr/bin/env bash
# Intentionally cause a webhook processing failure and confirm:
#   1. A webhook_events row is written with status='failed'.
#   2. (If alerting is configured) an admin notification/alert was produced.
#
# How the failure is forced:
#   `stripe trigger checkout.session.completed` is overridden so the payload
#   contains metadata.booking_id="not-a-uuid" and payment_status=paid.
#   The stripe-webhook handler then tries to UPDATE booking_requests where
#   id = 'not-a-uuid'. PostgREST rejects the invalid UUID, the handler's
#   catch block runs, and status='failed' is written.
#
# Prerequisites: same .env as trigger-webhook-test.sh
#   SUPABASE_URL, SUPABASE_ANON_KEY, STRIPE_ENDPOINT, ADMIN_EMAIL, ADMIN_PASSWORD
#
# Usage:
#   ./trigger-webhook-failure-test.sh
#   ./trigger-webhook-failure-test.sh --env-file path/to/.env

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ENV_FILE=""
POLL_TIMEOUT_SEC=30
POLL_INTERVAL_SEC=2

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file) ENV_FILE="$2"; shift 2 ;;
    --timeout)  POLL_TIMEOUT_SEC="$2"; shift 2 ;;
    -h|--help)  grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$ENV_FILE" ]]; then
  if   [[ -f "$SCRIPT_DIR/.env" ]]; then ENV_FILE="$SCRIPT_DIR/.env"
  elif [[ -f "$REPO_ROOT/.env"  ]]; then ENV_FILE="$REPO_ROOT/.env"
  fi
fi
[[ -z "$ENV_FILE" || ! -f "$ENV_FILE" ]] && { echo "FAIL: no .env found." >&2; exit 2; }
echo "==> Loading env from $ENV_FILE"

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

command -v stripe >/dev/null || { echo "FAIL: Stripe CLI not installed" >&2; exit 1; }
command -v curl   >/dev/null || { echo "FAIL: curl required" >&2; exit 1; }
command -v jq     >/dev/null || { echo "FAIL: jq required" >&2; exit 1; }

missing=()
for v in SUPABASE_URL SUPABASE_ANON_KEY STRIPE_ENDPOINT ADMIN_EMAIL ADMIN_PASSWORD; do
  [[ -z "${!v:-}" ]] && missing+=("$v")
done
(( ${#missing[@]} )) && { echo "FAIL: missing env: ${missing[*]}" >&2; exit 2; }

# --- 1. Admin login ----------------------------------------------------------
echo "==> Signing in as $ADMIN_EMAIL"
LOGIN=$(curl -sS -X POST \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  --data "$(jq -nc --arg e "$ADMIN_EMAIL" --arg p "$ADMIN_PASSWORD" '{email:$e,password:$p}')" \
  "${SUPABASE_URL}/auth/v1/token?grant_type=password")
ACCESS_TOKEN=$(echo "$LOGIN" | jq -r '.access_token // empty')
[[ -z "$ACCESS_TOKEN" ]] && { echo "FAIL: admin login: $(echo "$LOGIN" | jq -c '.')" >&2; exit 3; }

# Snapshot notification count BEFORE, so we can detect one added AFTER.
BEFORE_TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# --- 2. Trigger a poisoned checkout.session.completed ------------------------
echo "==> Triggering failing checkout.session.completed (invalid booking_id)..."
stripe trigger checkout.session.completed \
  --override "checkout_session:metadata.booking_id=not-a-uuid" \
  --override "checkout_session:payment_status=paid" \
  >/dev/null

sleep 2
EVENT_ID=$(stripe events list --limit 1 --type checkout.session.completed \
  | jq -r '.data[0].id')
[[ -z "$EVENT_ID" || "$EVENT_ID" == "null" ]] && { echo "FAIL: no event id" >&2; exit 3; }
echo "==> Stripe event: $EVENT_ID"

echo "==> Resending to $STRIPE_ENDPOINT ..."
stripe events resend "$EVENT_ID" --webhook-endpoint "$STRIPE_ENDPOINT" >/dev/null || true

# --- 3. Poll admin edge function for the failed row --------------------------
CHECK_URL="${SUPABASE_URL}/functions/v1/check-webhook-event?event_id=${EVENT_ID}"
echo "==> Polling check-webhook-event (timeout ${POLL_TIMEOUT_SEC}s)..."
DEADLINE=$(( $(date +%s) + POLL_TIMEOUT_SEC ))
BODY=""; STATUS=""
while (( $(date +%s) < DEADLINE )); do
  RESP=$(curl -sS -w '\n%{http_code}' \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    "$CHECK_URL")
  CODE="${RESP##*$'\n'}"
  BODY="${RESP%$'\n'*}"
  if [[ "$CODE" == "200" ]]; then
    STATUS=$(echo "$BODY" | jq -r '.status')
    [[ "$STATUS" == "failed" || "$STATUS" == "processed" ]] && break
  fi
  sleep "$POLL_INTERVAL_SEC"
done

if [[ "$STATUS" != "failed" ]]; then
  echo "FAIL: expected status='failed', got status='${STATUS:-none}'." >&2
  echo "      Body: $BODY" >&2
  exit 4
fi

ERR=$(echo "$BODY" | jq -r '.error_message // ""')
echo
echo "==> Failure captured"
echo "     event_id:  $EVENT_ID"
echo "     status:    failed"
echo "     error:     ${ERR:-<none recorded>}"

# --- 4. Verify alert artifact (best-effort) ---------------------------------
# The project has no alert channel wired to webhook_events yet. Once one
# exists (e.g. a row inserted into public.notifications for admins on failed
# webhooks, or an email logged to email_send_log), extend the check below.
echo
echo "==> Checking for admin alert artifacts created since ${BEFORE_TS}..."

NOTIF_URL="${SUPABASE_URL}/rest/v1/notifications?select=id,title,message,created_at&created_at=gte.${BEFORE_TS}&title=ilike.*webhook*"
NOTIFS=$(curl -sS \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "$NOTIF_URL" || echo "[]")

COUNT=$(echo "$NOTIFS" | jq 'length' 2>/dev/null || echo 0)
if [[ "$COUNT" -gt 0 ]]; then
  echo "PASS: found $COUNT alert notification(s):"
  echo "$NOTIFS" | jq -r '.[] | "     - [\(.created_at)] \(.title): \(.message)"'
  exit 0
fi

echo "WARN: no webhook-failure alert was produced."
echo "      The failed row exists (verified above), but no admin notification"
echo "      was created. Alerting is not yet wired to webhook_events failures."
echo "      Confirm the delivery channel (email / Slack / notifications table)"
echo "      and I'll implement it, then this script will assert PASS."
exit 6
