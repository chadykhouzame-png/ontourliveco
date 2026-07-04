import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, ExternalLink } from 'lucide-react';

const WebhookTestingGuide = () => {
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
      <CardContent>
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
                below. If it fails, the error message tells you exactly which check failed (signature, secret, handler code).
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
            <AccordionTrigger>Nothing shows up — troubleshooting checklist</AccordionTrigger>
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
                  <strong>Sandbox vs Live:</strong> test events fire only to endpoints registered in the same mode. If you're
                  in Stripe sandbox, the endpoint must be registered in sandbox.
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
