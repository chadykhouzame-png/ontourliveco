/**
 * Redaction helpers for admin-facing Stripe webhook payload inspection.
 *
 * The goal is to keep everything useful for diagnosing a failed event
 * (ids, types, statuses, amounts, timestamps, error codes) while removing
 * personal and payment-sensitive values (emails, names, addresses, phone
 * numbers, card details, secrets, tokens, URLs that grant access).
 */

const SENSITIVE_KEY_PATTERNS: RegExp[] = [
  /email/i,
  /phone/i,
  /name$/i,
  /^name$/i,
  /address/i,
  /line1|line2|postal_code|^city$|^state$|^country$/i,
  /card|cvc|exp_month|exp_year|last4|iin|fingerprint|network_token/i,
  /secret|token|password|signature|api_key|client_secret/i,
  /^ip$|ip_address|user_agent/i,
  /receipt_url|hosted_invoice_url|invoice_pdf|^url$|return_url|success_url|cancel_url/i,
  /tax_id|vat|ssn|dob|birth/i,
  /bank|iban|routing|account_number|bsb/i,
];

const ALWAYS_KEEP = new Set([
  'id',
  'object',
  'type',
  'status',
  'payment_status',
  'livemode',
  'created',
  'amount',
  'amount_total',
  'amount_received',
  'amount_subtotal',
  'currency',
  'mode',
  'code',
  'decline_code',
  'message',
  'payment_intent',
  'checkout_session',
  'client_reference_id',
  'metadata',
]);

const isSensitiveKey = (key: string) =>
  !ALWAYS_KEEP.has(key) && SENSITIVE_KEY_PATTERNS.some((re) => re.test(key));

const maskValue = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number') return '[redacted number]';
  if (typeof value === 'boolean') return '[redacted]';
  if (typeof value === 'string') {
    if (value.length === 0) return value;
    return `[redacted · ${value.length} chars]`;
  }
  return '[redacted]';
};

export type RedactionResult = { value: unknown; redactedCount: number };

const walk = (input: unknown, counter: { n: number }, depth = 0): unknown => {
  if (depth > 12) return '[depth limit]';
  if (Array.isArray(input)) return input.map((item) => walk(item, counter, depth + 1));
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        out[key] = maskValue(value);
        counter.n += 1;
      } else {
        out[key] = walk(value, counter, depth + 1);
      }
    }
    return out;
  }
  return input;
};

export const redactPayload = (payload: unknown): RedactionResult => {
  const counter = { n: 0 };
  const value = walk(payload, counter);
  return { value, redactedCount: counter.n };
};

/** Short, safe diagnostic summary pulled from a Stripe event payload. */
export const diagnosticSummary = (payload: any): Array<{ label: string; value: string }> => {
  if (!payload || typeof payload !== 'object') return [];
  const obj = payload.data?.object ?? payload.object_data ?? payload;
  const rows: Array<{ label: string; value: string }> = [];
  const push = (label: string, value: unknown) => {
    if (value === null || value === undefined || value === '') return;
    rows.push({ label, value: String(value) });
  };

  push('Object', obj?.object);
  push('Object ID', obj?.id);
  push('Status', obj?.status);
  push('Payment status', obj?.payment_status);
  const amount = obj?.amount_total ?? obj?.amount ?? obj?.amount_received;
  if (typeof amount === 'number') {
    push('Amount', `${(amount / 100).toFixed(2)} ${String(obj?.currency ?? '').toUpperCase()}`);
  }
  push('Mode', obj?.livemode === true ? 'Live' : obj?.livemode === false ? 'Test' : undefined);
  push(
    'Payment intent',
    typeof obj?.payment_intent === 'string' ? obj.payment_intent : obj?.payment_intent?.id,
  );
  push('Booking reference', obj?.metadata?.booking_request_id ?? obj?.client_reference_id);
  push('Failure code', obj?.last_payment_error?.code ?? obj?.failure_code);
  push('Failure message', obj?.last_payment_error?.message ?? obj?.failure_message);
  return rows;
};
