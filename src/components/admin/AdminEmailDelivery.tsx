import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Clock, Loader2, MailX, RefreshCw, Send, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Signup = {
  id: string;
  email: string;
  role: string | null;
  created_at: string;
};

type LogRow = {
  id: string;
  email: string;
  status: "sent" | "suppressed" | "failed";
  reason: string | null;
  error_code: string | null;
  trigger_source: string | null;
  created_at: string;
};

type Outcome = "delivered" | "failed" | "bounced" | "pending";

type Monitored = {
  signup: Signup;
  outcome: Outcome;
  attempts: number;
  lastAttemptAt: string | null;
  detail: string;
};

type Filter = "attention" | "failed" | "bounced" | "pending" | "all";

const REASON_LABEL: Record<string, string> = {
  domain_not_verified: "Sender domain not verified yet",
  emails_disabled: "Email sending is switched off",
  recipient_suppressed: "Recipient opted out or previously bounced",
};

function isBounce(log: LogRow): boolean {
  const text = `${log.error_code ?? ""} ${log.reason ?? ""}`.toLowerCase();
  return (
    text.includes("bounce") ||
    text.includes("invalid_recipient") ||
    text.includes("mailbox") ||
    text.includes("suppress")
  );
}

function detailFor(log: LogRow | null, outcome: Outcome): string {
  if (outcome === "pending") return "No send recorded yet";
  if (!log) return "—";
  if (log.status === "sent") return "Accepted by the email provider";
  if (log.error_code && REASON_LABEL[log.error_code]) return REASON_LABEL[log.error_code];
  if (log.reason && REASON_LABEL[log.reason]) return REASON_LABEL[log.reason];
  return log.reason || log.error_code || "Rejected by the email provider";
}

const OUTCOME_LABEL: Record<Outcome, string> = {
  delivered: "Delivered",
  failed: "Failed",
  bounced: "Bounced / blocked",
  pending: "Pending",
};

export default function AdminEmailDelivery() {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("attention");
  const [resending, setResending] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [signupRes, logRes] = await Promise.all([
      supabase
        .from("waitlist")
        .select("id, email, role, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("waitlist_email_log")
        .select("id, email, status, reason, error_code, trigger_source, created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);
    setSignups((signupRes.data as Signup[]) ?? []);
    setLogs((logRes.data as LogRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const monitored = useMemo<Monitored[]>(() => {
    const byEmail = new Map<string, LogRow[]>();
    for (const log of logs) {
      const key = log.email.toLowerCase();
      const list = byEmail.get(key) ?? [];
      list.push(log);
      byEmail.set(key, list);
    }
    return signups.map((signup) => {
      const history = byEmail.get(signup.email.toLowerCase()) ?? [];
      const latest = history[0] ?? null;
      const delivered = history.some((h) => h.status === "sent");
      let outcome: Outcome;
      if (delivered) outcome = "delivered";
      else if (history.length === 0) outcome = "pending";
      else if (history.some(isBounce)) outcome = "bounced";
      else outcome = "failed";
      return {
        signup,
        outcome,
        attempts: history.length,
        lastAttemptAt: latest?.created_at ?? null,
        detail: detailFor(latest, outcome),
      };
    });
  }, [signups, logs]);

  const counts = useMemo(() => {
    const base = { delivered: 0, failed: 0, bounced: 0, pending: 0 };
    for (const m of monitored) base[m.outcome] += 1;
    return base;
  }, [monitored]);

  const visible = useMemo(() => {
    if (filter === "all") return monitored;
    if (filter === "attention") return monitored.filter((m) => m.outcome !== "delivered");
    return monitored.filter((m) => m.outcome === filter);
  }, [monitored, filter]);

  const resend = async (email: string) => {
    setResending(email);
    try {
      const { data, error } = await supabase.functions.invoke("resend-waitlist-confirmation", {
        body: { email },
      });
      const status = (data as { status?: string; reason?: string } | null)?.status;
      if (error || status === "failed") {
        toast({
          title: "Could not resend",
          description:
            (data as { reason?: string } | null)?.reason ?? "The email service refused the send.",
          variant: "destructive",
        });
      } else if (status === "suppressed") {
        toast({
          title: "Blocked",
          description: "This recipient has opted out or previously bounced.",
        });
      } else {
        toast({ title: "Confirmation resent", description: email });
      }
      await load();
    } finally {
      setResending(null);
    }
  };

  const attentionTotal = counts.failed + counts.bounced + counts.pending;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MailX className="h-4 w-4" /> Delivery monitoring
            </CardTitle>
            <CardDescription>
              Every artist and venue sign-up checked against its confirmation email.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {attentionTotal > 0 && !loading && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
            <p className="text-sm">
              <span className="font-medium">{attentionTotal}</span> sign-up
              {attentionTotal === 1 ? "" : "s"} did not receive a confirmation email.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(
            [
              { key: "failed", label: "Failed", value: counts.failed, Icon: AlertTriangle },
              { key: "bounced", label: "Bounced / blocked", value: counts.bounced, Icon: ShieldAlert },
              { key: "pending", label: "Pending", value: counts.pending, Icon: Clock },
              { key: "all", label: "Delivered", value: counts.delivered, Icon: Send },
            ] as const
          ).map(({ key, label, value, Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => setFilter(key as Filter)}
              className="rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
            >
              <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Icon className="h-3.5 w-3.5" /> {label}
              </span>
              <span className="mt-1 block text-2xl font-semibold">{value}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {(["attention", "failed", "bounced", "pending", "all"] as Filter[]).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f === "attention"
                ? `Needs attention (${attentionTotal})`
                : f === "all"
                  ? `All (${monitored.length})`
                  : `${OUTCOME_LABEL[f as Outcome]} (${counts[f as Outcome]})`}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {filter === "attention"
              ? "Every sign-up received its confirmation email."
              : "Nothing to show here."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Signed up</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Joined as</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((m) => (
                  <TableRow
                    key={m.signup.id}
                    className={m.outcome === "failed" || m.outcome === "bounced" ? "bg-destructive/5" : undefined}
                  >
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(m.signup.created_at).toLocaleString("en-AU")}
                    </TableCell>
                    <TableCell className="text-sm sentry-mask">{m.signup.email}</TableCell>
                    <TableCell className="text-sm capitalize">{m.signup.role ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.outcome === "delivered"
                            ? "default"
                            : m.outcome === "pending"
                              ? "secondary"
                              : m.outcome === "bounced"
                                ? "outline"
                                : "destructive"
                        }
                      >
                        {OUTCOME_LABEL[m.outcome]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] text-sm text-muted-foreground">
                      {m.detail}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.attempts}
                      {m.lastAttemptAt && (
                        <span className="ml-1 text-xs">
                          (last {new Date(m.lastAttemptAt).toLocaleDateString("en-AU")})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resend(m.signup.email)}
                        disabled={resending === m.signup.email}
                      >
                        {resending === m.signup.email ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-3.5 w-3.5" />
                        )}
                        Resend
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
