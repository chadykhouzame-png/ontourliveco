import { Star } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string;
  reviewer_type: 'artist' | 'venue';
}

interface ReviewsListProps {
  reviews: Review[];
  emptyMessage?: string;
}

const StarRatingDisplay = ({ rating }: { rating: number }) => {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating
              ? 'fill-warning text-warning'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
};

export const ReviewsList = ({ reviews, emptyMessage = "No reviews yet" }: ReviewsListProps) => {
  if (reviews.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-warning" />
            Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-warning" />
            Reviews
        </CardTitle>
        <CardDescription>
          {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {reviews.map((review) => (
          <div 
            key={review.id} 
            className="p-4 rounded-lg bg-secondary/30 border border-border"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium">{review.reviewer_name}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(review.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              <StarRatingDisplay rating={review.rating} />
            </div>
            {review.comment && (
              <p className="text-sm text-muted-foreground mt-2">
                "{review.comment}"
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export type { Review };
