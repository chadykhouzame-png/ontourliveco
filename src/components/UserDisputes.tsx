import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, ExternalLink, Clock, CheckCircle, XCircle, Search, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface Dispute {
  id: string;
  title: string;
  description: string;
  dispute_type: string;
  status: string;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
  reported_artist_id: string | null;
  reported_venue_id: string | null;
  reported_artist?: {
    id: string;
    artist_name: string;
  } | null;
  reported_venue?: {
    id: string;
    venue_name: string;
  } | null;
  booking_request?: {
    id: string;
    requested_date: string;
    offer_amount: number | null;
  } | null;
}

const DISPUTE_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  open: { label: 'Open', variant: 'default', icon: Clock },
  in_review: { label: 'In Review', variant: 'secondary', icon: Search },
  resolved: { label: 'Resolved', variant: 'outline', icon: CheckCircle },
  dismissed: { label: 'Dismissed', variant: 'destructive', icon: XCircle },
};

const DISPUTE_TYPE_LABELS: Record<string, string> = {
  misconduct: 'Misconduct',
  payment_issue: 'Payment Issue',
  no_show: 'No Show',
  quality_issue: 'Quality Issue',
  harassment: 'Harassment',
  false_profile: 'False Profile',
  other: 'Other',
};

const UserDisputes = () => {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchDisputes = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('disputes')
          .select(`
            *,
            reported_artist:artists!disputes_reported_artist_id_fkey(id, artist_name),
            reported_venue:venues!disputes_reported_venue_id_fkey(id, venue_name),
            booking_request:booking_requests!disputes_booking_request_id_fkey(id, requested_date, offer_amount)
          `)
          .eq('reporter_user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDisputes(data || []);
      } catch (error) {
        console.error('Error fetching user disputes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDisputes();
  }, [user]);

  const handleViewDetails = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setDetailsDialogOpen(true);
  };

  const getStatusConfig = (status: string) => {
    return DISPUTE_STATUS_CONFIG[status] || DISPUTE_STATUS_CONFIG.open;
  };

  if (isLoading) {
    return (
      <Card className="glass border-border/50 rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/30 bg-secondary/20">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            My Disputes
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass border-border/50 rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/30 bg-secondary/20">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            My Disputes
          </CardTitle>
          <CardDescription>
            {disputes.length === 0
              ? "You haven't submitted any disputes"
              : `${disputes.length} dispute${disputes.length === 1 ? '' : 's'} submitted`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {disputes.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No disputes submitted</p>
              <p className="text-sm text-muted-foreground mt-1">
                You can report issues from any profile page
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {disputes.slice(0, 5).map((dispute) => {
                const statusConfig = getStatusConfig(dispute.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div
                    key={dispute.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 backdrop-blur-sm border border-border/30 cursor-pointer hover:bg-secondary/50 transition-colors haptic"
                    onClick={() => handleViewDetails(dispute)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{dispute.title}</p>
                        <Badge variant={statusConfig.variant} className="flex items-center gap-1 shrink-0">
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {dispute.reported_artist?.artist_name || dispute.reported_venue?.venue_name || 'Unknown'}
                        {' • '}
                        {format(new Date(dispute.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                  </div>
                );
              })}
              {disputes.length > 5 && (
                <p className="text-center text-sm text-muted-foreground pt-2">
                  And {disputes.length - 5} more dispute{disputes.length - 5 > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dispute Details</DialogTitle>
            <DialogDescription>
              Submitted on {selectedDispute && format(new Date(selectedDispute.created_at), 'MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={getStatusConfig(selectedDispute.status).variant} className="flex items-center gap-1">
                  {(() => {
                    const StatusIcon = getStatusConfig(selectedDispute.status).icon;
                    return <StatusIcon className="w-3 h-3" />;
                  })()}
                  {getStatusConfig(selectedDispute.status).label}
                </Badge>
              </div>

              {/* Title & Type */}
              <div>
                <h3 className="font-semibold">{selectedDispute.title}</h3>
                <Badge variant="outline" className="mt-1">
                  {DISPUTE_TYPE_LABELS[selectedDispute.dispute_type] || selectedDispute.dispute_type}
                </Badge>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                <p className="text-sm bg-secondary/30 p-3 rounded-lg">{selectedDispute.description}</p>
              </div>

              {/* Reported Party */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Reported Party</h4>
                <div className="flex items-center gap-2">
                  {selectedDispute.reported_artist ? (
                    <>
                      <span className="text-sm">{selectedDispute.reported_artist.artist_name}</span>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/artist/${selectedDispute.reported_artist.id}`} target="_blank">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Profile
                        </Link>
                      </Button>
                    </>
                  ) : selectedDispute.reported_venue ? (
                    <>
                      <span className="text-sm">{selectedDispute.reported_venue.venue_name}</span>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/venue/${selectedDispute.reported_venue.id}`} target="_blank">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Profile
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unknown</span>
                  )}
                </div>
              </div>

              {/* Linked Booking */}
              {selectedDispute.booking_request && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Related Booking</h4>
                  <div className="text-sm bg-secondary/30 p-3 rounded-lg">
                    <p>Date: {format(new Date(selectedDispute.booking_request.requested_date), 'MMMM d, yyyy')}</p>
                    {selectedDispute.booking_request.offer_amount && (
                      <p>Amount: ${selectedDispute.booking_request.offer_amount.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Resolution (if resolved) */}
              {selectedDispute.resolution && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Resolution</h4>
                  <p className="text-sm bg-green-500/10 border border-green-500/20 p-3 rounded-lg">
                    {selectedDispute.resolution}
                  </p>
                  {selectedDispute.resolved_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Resolved on {format(new Date(selectedDispute.resolved_at), 'MMMM d, yyyy')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserDisputes;
