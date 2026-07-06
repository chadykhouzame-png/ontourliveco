import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  Search,
  Trash2,
  Download,
  RefreshCw,
  Users2,
  Music2,
  Building2,
} from 'lucide-react';

type Row = {
  id: string;
  email: string;
  role: 'artist' | 'venue';
  first_name: string | null;
  last_name: string | null;
  artist_name: string | null;
  venue_name: string | null;
  created_at: string;
};

type RoleFilter = 'all' | 'artist' | 'venue';

const PAGE_SIZE = 50;

const AdminWaitlist = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');
  const [pending, setPending] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(0);

  const load = async (opts?: { silent?: boolean }) => {
    if (opts?.silent) setRefreshing(true);
    else setLoading(true);
    const { data, error } = await supabase
      .from('waitlist')
      .select('id,email,role,first_name,last_name,artist_name,venue_name,created_at')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Could not load waitlist', description: error.message, variant: 'destructive' });
    } else {
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (role !== 'all' && r.role !== role) return false;
      if (!q) return true;
      return (
        r.email.toLowerCase().includes(q) ||
        (r.first_name ?? '').toLowerCase().includes(q) ||
        (r.last_name ?? '').toLowerCase().includes(q) ||
        (r.artist_name ?? '').toLowerCase().includes(q) ||
        (r.venue_name ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, role]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const paged = filtered.slice(pageSafe * PAGE_SIZE, (pageSafe + 1) * PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [search, role]);

  const stats = useMemo(() => {
    const total = rows.length;
    const artists = rows.filter((r) => r.role === 'artist').length;
    const venues = rows.filter((r) => r.role === 'venue').length;
    return { total, artists, venues };
  }, [rows]);

  const exportCsv = () => {
    const header = [
      'position',
      'email',
      'role',
      'first_name',
      'last_name',
      'artist_name',
      'venue_name',
      'created_at',
    ];
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    // Position reflects overall queue position (older = lower number).
    const withPos = [...filtered]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((r, i) => ({ pos: i + 1, r }));
    const lines = [header.join(',')].concat(
      withPos.map(({ pos, r }) =>
        [
          pos,
          r.email,
          r.role,
          r.first_name,
          r.last_name,
          r.artist_name,
          r.venue_name,
          r.created_at,
        ]
          .map(escape)
          .join(',')
      )
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const confirmDelete = async () => {
    if (!pending) return;
    setDeleting(true);
    const { error } = await supabase.from('waitlist').delete().eq('id', pending.id);
    setDeleting(false);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== pending.id));
    toast({ title: 'Signup removed', description: pending.email });
    setPending(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Users2 className="h-5 w-5 text-primary" />} label="Total signups" value={stats.total} />
        <StatCard icon={<Music2 className="h-5 w-5 text-primary" />} label="Artists" value={stats.artists} />
        <StatCard icon={<Building2 className="h-5 w-5 text-primary" />} label="Venues" value={stats.venues} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Waitlist signups</CardTitle>
          <CardDescription>
            Search, filter, export or remove entries from the public waitlist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search email, name, artist or venue"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={role} onValueChange={(v) => setRole(v as RoleFilter)}>
                <SelectTrigger className="sm:w-[160px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="artist">Artists</SelectItem>
                  <SelectItem value="venue">Venues</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => load({ silent: true })}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">Name</TableHead>
                  <TableHead className="hidden lg:table-cell">Artist / Venue</TableHead>
                  <TableHead className="hidden sm:table-cell">Joined</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      {rows.length === 0 ? 'No signups yet.' : 'No matches.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Badge variant={r.role === 'artist' ? 'default' : 'secondary'}>
                          {r.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{r.email}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {r.role === 'artist' ? r.artist_name ?? '—' : r.venue_name ?? '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPending(r)}
                          aria-label={`Remove ${r.email}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {pageSafe * PAGE_SIZE + 1}–
                {Math.min((pageSafe + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={pageSafe === 0}
                >
                  Previous
                </Button>
                <span>
                  Page {pageSafe + 1} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={pageSafe >= pageCount - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this signup?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.email} will be permanently removed from the waitlist. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) => (
  <Card>
    <CardContent className="flex items-center gap-4 py-5">
      <div className="rounded-lg bg-muted p-3">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
      </div>
    </CardContent>
  </Card>
);

export default AdminWaitlist;
