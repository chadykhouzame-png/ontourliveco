import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, ExternalLink, CheckCircle2, XCircle, Circle, AlertTriangle } from 'lucide-react';
import { useWebhookTest, WebhookTestResult } from './WebhookTestContext';
import { formatDistanceToNow } from 'date-fns';

type CheckState = 'pending' | 'pass' | 'fail' | 'warn';

interface CheckItem {
  id: string;
  label: string;
  state: CheckState;
  detail: string;
}

const buildChecklist = (r: WebhookTestResult | null): CheckItem[] => {
  if (!r) {
    return [
      { id: 'invoke', label: 'Test event dispatched', state: 'pending', detail: 'Click "Send Test Event" above to run diagnostics.' },
      { id: 'network', label: 'Edge function reachable', state: 'pending', detail: 'We\'ll POST a signed event to the stripe-webhook function.' },
      { id: 'signature', label: 'Signature accepted', state: 'pending', detail: 'The event is signed with STRIPE_WEBHOOK_SECRET.' },
      { id: 'handler', label: 'Handler processed the event', state: 'pending', detail: 'Handler returns 200 on success.' },
      { id: 'logged', label: 'Event written to audit log', state: 'pending', detail: 'A new row will appear in the Webhook Events table.' },
    ];
  }

  const err = (r.error || '').toLowerCase();
  const body = (r.response_body || '').toLowerCase();
  const status = r.status;

  // Failure to even invoke the edge function (auth, network, secret missing)
  const invokeFailed = status === undefined;
  const missingSecret = err.includes('stripe_webhook_secret') || body.includes('stripe_webhook_secret');
  const notAdmin = err.includes('admin') || err.includes('not authenticated');
  const signatureFailed = status === 400 || body.includes('signature') || body.includes('invalid signature');
  const handlerErrored = status !== undefined && status >= 500;

  const dispatched: CheckItem = {
    id: 'invoke',
    label: 'Test event dispatched',
    state: invokeFailed ? 'fail' : 'pass',
    detail: invokeFailed
      ? notAdmin
        ? 'You\'re not signed in as admin. Sign in with an admin account and try again.'
        : `Failed to invoke test function: ${r.error || 'unknown error'}`
      : `Signed synthetic ${r.event_type ?? 'event'} and dispatched to endpoint.`,
  };

  const network: CheckItem = {
    id: 'network',
    label: 'Edge function reachable',
    state: invokeFailed || missingSecret
      ? 'fail'
      : status !== undefined
      ? 'pass'
      : 'pending',
    detail: missingSecret
      ? 'STRIPE_WEBHOOK_SECRET is not configured in Cloud → Secrets. Add it and re-run.'
      : invokeFailed
      ? 'The test function did not return an HTTP status from the webhook. Check edge function logs.'
      : `HTTP ${status} in ${r.duration_ms ?? '?'}ms.`,
  };

  const signature: CheckItem = {
    id: 'signature',
    label: 'Signature accepted',
    state: invokeFailed || missingSecret
      ? 'pending'
      : signatureFailed
      ? 'fail'
      : status !== undefined && status < 400
      ? 'pass'
      : 'warn',
    detail: signatureFailed
      ? 'The webhook rejected the signature. STRIPE_WEBHOOK_SECRET in Cloud → Secrets probably does not match the whsec_… value in Stripe. Rotate or re-copy it.'
      : status !== undefined && status < 400
      ? 'Signature verified — the shared secret matches Stripe.'
      : 'Signature check did not run to completion.',
  };

  const handler: CheckItem = {
    id: 'handler',
    label: 'Handler processed the event',
    state: invokeFailed
      ? 'pending'
      : handlerErrored
      ? 'fail'
      : signatureFailed
      ? 'pending'
      : r.success
      ? 'pass'
      : 'warn',
    detail: handlerErrored
      ? `Handler threw an error (HTTP ${status}). Check the stripe-webhook function logs for the stack trace.`
      : r.success
      ? 'Handler returned 200 — event routed to its case successfully.'
      : `Response: ${r.response_body?.slice(0, 200) || 'no body'}`,
  };

  const logged: CheckItem = {
    id: 'logged',
    label: 'Event written to audit log',
    state: r.success
      ? 'pass'
      : invokeFailed || handlerErrored
      ? 'warn'
      : 'pending',
    detail: r.success
      ? `Look for event ${r.event_id ?? ''} in the table above (may take a second).`
      : 'The event row may still be logged with status=failed if the handler threw after upserting.',
  };

  return [dispatched, network, signature, handler, logged];
};

const stateIcon = (s: CheckState) => {
  switch (s) {
    case 'pass': return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />;
    case 'fail': return <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />;
    case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />;
    default: return <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />;
  }
};

const WebhookTestingGuide = () => {
  const { lastResult } = useWebhookTest();
  const checklist = buildChecklist(lastResult);
  const overall: CheckState = !lastResult
    ? 'pending'
    : lastResult.success
    ? 'pass'
    : 'fail';

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HelpCircle className="h-5 w-5 text-primary" />
          How to send Stripe test events (no CLI needed)
        </CardTitle>
        <CardDescription>
          Three ways to trigger real webhook deliveries — all from the browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Interactive diagnostic checklist */}
        <div className="rounded-lg border bg-muted/20 p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Diagnostic checklist</h3>
              <Badge
                variant={
                  overall === 'pass' ? 'default' : overall === 'fail' ? 'destructive' : 'secondary'
                }
                className="text-[10px]"
              >
                {overall === 'pass' ? 'All checks passed' : overall === 'fail' ? 'Issues detected' : 'Awaiting test run'}
              </Badge>
            </div>
            {lastResult && (
              <span className="text-xs text-muted-foreground">
                Last run {formatDistanceToNow(new Date(lastResult.ranAt), { addSuffix: true })}
              </span>
            )}
          </div>
          {!lastResult && (
            <p className="text-xs text-muted-foreground mb-3">
              Click <strong>Send Test Event</strong> in the Webhook Events card above. The steps below will light up
              green, yellow, or red based on what actually happened.
            </p>
          )}
          <ul className="space-y-2">
            {checklist.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-sm">
                {stateIcon(c.state)}
                <div className="flex-1 min-w-0">
                  <div
                    className={
                      c.state === 'fail'
                        ? 'text-destructive font-medium'
                        : c.state === 'pass'
                        ? 'text-foreground'
                        : c.state === 'warn'
                        ? 'text-yellow-600 dark:text-yellow-400 font-medium'
                        : 'text-muted-foreground'
                    }
                  >
                    {c.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="in-app">
            <AccordionTrigger>Option 1 — Use the "Send Test Event" button above (easiest)</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>Click <strong>Send Test Event</strong> in the header of the Webhook Events card.</p>
              <p>
                This signs a synthetic <code className="text-xs bg-muted px-1 py-0.5 rounded">account.updated</code>{' '}
                event with your live <code className="text-xs bg-muted px-1 py-0.5 rounded">STRIPE_WEBHOOK_SECRET</code>{' '}
                and POSTs it directly to the webhook edge function.
              </p>
              <p>
                On success, you'll see HTTP 200 in the result banner, and a new row will appear in the events table
                below. If it fails, the checklist above tells you exactly which step failed.
              </p>
              <p className="text-xs italic">Best for verifying the endpoint + secret are wired up correctly.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="stripe-dashboard">
            <AccordionTrigger>Option 2 — Send from the Stripe Dashboard</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <ol className="list-decimal list-inside space-y-1">
                <li>Open the Stripe Dashboard → <strong>Developers → Webhooks</strong>.</li>
                <li>Click the webhook endpoint (e.g. <code className="text-xs bg-muted px-1 py-0.5 rounded">on-tour-live-bookings</code>).</li>
                <li>Click <strong>Send test events</strong> (top-right).</li>
                <li>
                  A modal opens. <strong>Ignore the "Use Stripe CLI" popup</strong> — look for a small link like{' '}
                  <em>"Send from dashboard instead"</em> or the <strong>All events</strong> tab.
                </li>
                <li>Pick an event (e.g. <code className="text-xs bg-muted px-1 py-0.5 rounded">payment_intent.succeeded</code>) and click <strong>Send test webhook</strong>.</li>
                <li>Open the endpoint's <strong>Event deliveries</strong> tab to see the response status.</li>
              </ol>
              <p className="text-xs italic">
                If the CLI popup blocks everything, close it with the X, then look for the "..." menu next to Edit destination.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="real-flow">
            <AccordionTrigger>Option 3 — Trigger real events via the app (end-to-end)</AccordionTrigger>
            <AccordionContent className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">Trigger <code className="text-xs bg-muted px-1 py-0.5 rounded">account.updated</code>:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Sign in as an artist → open Artist Dashboard.</li>
                  <li>Click <strong>Set Up Payments</strong> under Payment Setup.</li>
                  <li>Complete Stripe onboarding with test values (see below).</li>
                </ol>
              </div>

              <div>
                <p className="font-medium text-foreground mb-1">Trigger <code className="text-xs bg-muted px-1 py-0.5 rounded">checkout.session.completed</code>:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>As a venue, create a booking request and get it accepted.</li>
                  <li>Click <strong>Pay booking</strong> → complete checkout with test card <code className="text-xs bg-muted px-1 py-0.5 rounded">4242 4242 4242 4242</code>.</li>
                </ol>
              </div>

              <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-xs">
                <p className="font-medium text-foreground">Stripe test values (sandbox mode):</p>
                <ul className="space-y-0.5">
                  <li><strong>Phone:</strong> 000-000-0000 (SMS code: 000000)</li>
                  <li><strong>DOB:</strong> 01/01/1901</li>
                  <li><strong>SSN / Tax ID:</strong> 000-00-0000</li>
                  <li><strong>Address:</strong> address_full_match, any city, CA, 10000</li>
                  <li><strong>Bank routing:</strong> 110000000 &nbsp; <strong>Account:</strong> 000123456789</li>
                  <li><strong>Card:</strong> 4242 4242 4242 4242, any future date, any CVC</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="troubleshooting">
            <AccordionTrigger>Nothing shows up — general troubleshooting</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Endpoint URL:</strong> must be the Supabase Edge Function URL, not{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/stripe/webhook</code>.
                </li>
                <li>
                  <strong>Signing secret:</strong> when you create or rotate the endpoint in Stripe, you must{' '}
                  copy the new <code className="text-xs bg-muted px-1 py-0.5 rounded">whsec_…</code> value and update the
                  {' '}<code className="text-xs bg-muted px-1 py-0.5 rounded">STRIPE_WEBHOOK_SECRET</code> in Cloud → Secrets.
                </li>
                <li>
                  <strong>Event scope:</strong> booking payments live on your account. Connect events (like{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">account.updated</code>) live on connected accounts.
                  You need endpoints (or a single endpoint) listening to <em>both</em> scopes.
                </li>
                <li>
                  <strong>Sandbox vs Live:</strong> test events fire only to endpoints registered in the same mode.
                </li>
                <li>
                  <strong>Delivery status in Stripe:</strong> Stripe's <em>Event deliveries</em> tab always shows the true HTTP
                  status. If it says 200 but nothing appears here, the DB write failed — check the edge function logs.
                </li>
              </ul>
              <a
                href="https://docs.stripe.com/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline text-xs mt-2"
              >
                Stripe webhook docs <ExternalLink className="h-3 w-3" />
              </a>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default WebhookTestingGuide;
