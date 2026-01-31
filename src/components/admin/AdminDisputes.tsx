import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Clock, CheckCircle, XCircle, Eye, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Dispute {
  id: string;
  reporter_user_id: string;
  reported_user_id: string | null;
  reported_artist_id: string | null;
  reported_venue_id: string | null;
  booking_request_id: string | null;
  dispute_type: string;
  title: string;
  description: string;
  status: string;
  resolution: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

const AdminDisputes = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['disputes', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('disputes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Dispute[];
    },
  });

  const updateDispute = useMutation({
    mutationFn: async ({ id, status, resolution, disputeTitle, disputeType }: { 
      id: string; 
      status: string; 
      resolution?: string;
      disputeTitle: string;
      disputeType: string;
    }) => {
      const updateData: Record<string, unknown> = { status };
      if (resolution) updateData.resolution = resolution;
      if (status === 'resolved' || status === 'dismissed') {
        updateData.resolved_at = new Date().toISOString();
      }
      
      const { error } = await supabase.from('disputes').update(updateData).eq('id', id);
      if (error) throw error;

      // Send email notification for status changes
      if (status === 'resolved' || status === 'dismissed' || status === 'in_review') {
        try {
          await supabase.functions.invoke('send-dispute-notification', {
            body: {
              type: status === 'in_review' ? 'in_review' : status,
              dispute_id: id,
              dispute_title: disputeTitle,
              dispute_type: disputeType,
              resolution: resolution,
            },
          });
          console.log('Dispute notification email sent');
        } catch (notifyError) {
          console.error('Failed to send dispute notification:', notifyError);
          // Don't throw - the dispute was updated successfully, just log the notification failure
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setSelectedDispute(null);
      setResolution('');
      setNewStatus('');
      toast.success('Dispute updated');
    },
    onError: () => toast.error('Failed to update dispute'),
  });

  const filteredDisputes = disputes?.filter((dispute) =>
    dispute.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dispute.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'in_review':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'dismissed':
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">Open</Badge>;
      case 'in_review':
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">In Review</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Resolved</Badge>;
      case 'dismissed':
        return <Badge variant="secondary">Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      general: 'bg-gray-500/10 text-gray-500',
      booking: 'bg-purple-500/10 text-purple-500',
      payment: 'bg-green-500/10 text-green-500',
      behavior: 'bg-orange-500/10 text-orange-500',
      fraud: 'bg-red-500/10 text-red-500',
      other: 'bg-blue-500/10 text-blue-500',
    };
    return (
      <Badge className={colors[type] || colors.other}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const handleResolve = () => {
    if (!selectedDispute || !newStatus) return;
    updateDispute.mutate({
      id: selectedDispute.id,
      status: newStatus,
      resolution: resolution || undefined,
      disputeTitle: selectedDispute.title,
      disputeType: selectedDispute.dispute_type,
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Dispute Management</CardTitle>
          <CardDescription>Review and resolve user disputes and reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search disputes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <div className="h-5 bg-muted rounded w-1/3" />
                      <div className="h-4 bg-muted rounded w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredDisputes && filteredDisputes.length > 0 ? (
            <div className="space-y-4">
              {filteredDisputes.map((dispute) => (
                <Card key={dispute.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(dispute.status)}
                          <h3 className="font-semibold truncate">{dispute.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          {getTypeBadge(dispute.dispute_type)}
                          {getStatusBadge(dispute.status)}
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(dispute.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{dispute.description}</p>
                        {dispute.resolution && (
                          <div className="mt-3 p-3 bg-muted rounded-md">
                            <p className="text-sm font-medium">Resolution:</p>
                            <p className="text-sm text-muted-foreground">{dispute.resolution}</p>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDispute(dispute);
                          setNewStatus(dispute.status);
                          setResolution(dispute.resolution || '');
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No disputes found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Review Dispute</DialogTitle>
            <DialogDescription>
              Update the status and add a resolution for this dispute
            </DialogDescription>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-medium">Title</Label>
                <p className="mt-1">{selectedDispute.title}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="mt-1 text-muted-foreground">{selectedDispute.description}</p>
              </div>
              <div className="flex gap-2">
                {getTypeBadge(selectedDispute.dispute_type)}
                <span className="text-sm text-muted-foreground">
                  Reported {format(new Date(selectedDispute.created_at), 'MMMM d, yyyy')}
                </span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resolution">Resolution Notes</Label>
                <Textarea
                  id="resolution"
                  placeholder="Add notes about how this dispute was resolved..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDispute(null)}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={updateDispute.isPending}>
              {updateDispute.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminDisputes;