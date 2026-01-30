import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StarRating } from '@/components/StarRating';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ReviewFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingRequestId: string;
  reviewerType: 'artist' | 'venue';
  reviewerId: string; // artist_id or venue_id
  revieweeType: 'artist' | 'venue';
  revieweeId: string; // artist_id or venue_id
  revieweeName: string;
  onReviewSubmitted?: () => void;
}

export const ReviewFormDialog = ({
  open,
  onOpenChange,
  bookingRequestId,
  reviewerType,
  reviewerId,
  revieweeType,
  revieweeId,
  revieweeName,
  onReviewSubmitted,
}: ReviewFormDialogProps) => {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        variant: "destructive",
        title: "Rating required",
        description: "Please select a star rating.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const reviewData: any = {
        booking_request_id: bookingRequestId,
        reviewer_type: reviewerType,
        reviewee_type: revieweeType,
        rating,
        comment: comment.trim() || null,
      };

      // Set reviewer and reviewee IDs based on type
      if (reviewerType === 'artist') {
        reviewData.reviewer_artist_id = reviewerId;
      } else {
        reviewData.reviewer_venue_id = reviewerId;
      }

      if (revieweeType === 'artist') {
        reviewData.reviewee_artist_id = revieweeId;
      } else {
        reviewData.reviewee_venue_id = revieweeId;
      }

      const { error } = await supabase
        .from('reviews')
        .insert(reviewData);

      if (error) throw error;

      toast({
        title: "Review submitted!",
        description: `Your review for ${revieweeName} has been saved.`,
      });

      setRating(0);
      setComment('');
      onOpenChange(false);
      onReviewSubmitted?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error submitting review",
        description: error.message || "Something went wrong.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review {revieweeName}</DialogTitle>
          <DialogDescription>
            Share your experience working with {revieweeName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Rating *</Label>
            <div className="flex justify-center py-2">
              <StarRating
                rating={rating}
                size="lg"
                interactive
                onRatingChange={setRating}
              />
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Great"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea
              id="comment"
              placeholder="Share details about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewFormDialog;
