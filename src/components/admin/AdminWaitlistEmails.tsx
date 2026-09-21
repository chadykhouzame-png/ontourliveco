import { Fragment, useEffect, useState } from "react";
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
import { ChevronDown, ChevronRight, Loader2, Mail, RefreshCw, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Row = {
  id: string;
  email: string;
  role: string | null;
  template: string;
  status: "sent" | "suppressed" | "failed";
  reason: string | null;
  error_code: string | null;
  trigger_source: string | null;
  created_at: string;
};

type Filter = "all" | "sent" | "suppressed" | "failed";

const REASON_LABEL: Record<string, string> = {
  domain_not_verified: "Sender domain not verified yet",
  emails_disabled: "Email sending is switched off",
  recipient_suppressed: "Recipient opted out or previously bounced",
};

function friendlyReason(row: Row): string {
  if (row.error_code && REASON_LABEL[row.error_code]) return REASON_LABEL[row.error_code];
  if (row.reason && REASON_LABEL[row.reason]) return REASON_LABEL[row.reason];
  return row.reason || row.error_code || "—";
}

function sourceLabel(source: string | null): string {
  if (source === "admin_resend") return "Resent by admin";
  if (source === "resend") return "Resent by user";
  return "Sign-up";
}

function statusLabel(status: Row["status"]): string {
  return status === "sent" ? "Delivered" : status === "failed" ? "Failed" : "Blocked";
}

export default function AdminWaitlistEmails() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("waitlist_email_log")
      .select("id, email, role, template, status, reason, error_code, trigger_source, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  const resend = async (email: string) => {
    setResendingEmail(email);
    try {
      const { data, error } = await supabase.functions.invoke(
        "resend-waitlist-confirmation",
        { body: { email } },
      );
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
      setResendingEmail(null);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const counts = {
    all: rows.length,
    sent: rows.filter((r) => r.status === "sent").length,
    suppressed: rows.filter((r) => r.status === "suppressed").length,
    failed: rows.filter((r) => r.status === "failed").length,
  };
  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Confirmation emails
            </CardTitle>
            <CardDescription>
              {counts.sent} delivered · {counts.failed} failed · {counts.suppressed} blocked
              {" "}(last {rows.length} sign-ups)
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {(["all", "sent", "failed", "suppressed"] as Filter[]).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "sent" ? "Delivered" : f === "failed" ? "Failed" : "Blocked"}
              {" "}({counts[f]})
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No confirmation emails recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>When</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Joined as</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => {
                  const history = rows.filter(
                    (h) => h.email.toLowerCase() === r.email.toLowerCase(),
                  );
                  const attempts = history.filter((h) => h.trigger_source !== "signup");
                  const isOpen = expanded === r.id;
                  return (
                  <>
                  <TableRow key={r.id}>
                    <TableCell className="align-top">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-expanded={isOpen}
                        aria-label={isOpen ? "Hide attempt history" : "Show attempt history"}
                        onClick={() => setExpanded(isOpen ? null : r.id)}
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(r.created_at).toLocaleString("en-AU")}
                    </TableCell>
                    <TableCell className="text-sm sentry-mask">{r.email}</TableCell>
                    <TableCell className="text-sm capitalize">{r.role ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "sent"
                            ? "default"
                            : r.status === "failed"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {statusLabel(r.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[320px] text-sm text-muted-foreground">
                      {friendlyReason(r)}
                      {r.trigger_source && r.trigger_source !== "signup" && (
                        <span className="ml-2 text-xs">
                          ({r.trigger_source === "admin_resend" ? "resent by admin" : "resent by user"})
                        </span>
                      )}
                      {attempts.length > 0 && (
                        <span className="ml-2 text-xs">
                          · {attempts.length} resend{attempts.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resend(r.email)}
                        disabled={resendingEmail === r.email}
                      >
                        {resendingEmail === r.email ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-3.5 w-3.5" />
                        )}
                        Resend
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow key={`${r.id}-history`} className="bg-muted/30 hover:bg-muted/30">
                      <TableCell />
                      <TableCell colSpan={6} className="py-3">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Attempt history for this recipient
                        </p>
                        <ol className="space-y-2">
                          {history.map((h) => (
                            <li key={h.id} className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="whitespace-nowrap text-muted-foreground">
                                {new Date(h.created_at).toLocaleString("en-AU")}
                              </span>
                              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                {sourceLabel(h.trigger_source)}
                              </span>
                              <Badge
                                variant={
                                  h.status === "sent"
                                    ? "default"
                                    : h.status === "failed"
                                      ? "destructive"
                                      : "outline"
                                }
                              >
                                {statusLabel(h.status)}
                              </Badge>
                              {h.status !== "sent" && (
                                <span className="text-muted-foreground">{friendlyReason(h)}</span>
                              )}
                            </li>
                          ))}
                        </ol>
                      </TableCell>
                    </TableRow>
                  )}
                  </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
