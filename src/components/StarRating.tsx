import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export const StarRating = ({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onRatingChange,
  className,
}: StarRatingProps) => {
  const handleClick = (starIndex: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starIndex + 1);
    }
  };

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: maxRating }).map((_, index) => {
        const isFilled = index < Math.floor(rating);
        const isHalfFilled = !isFilled && index < rating;
        
        return (
          <button
            key={index}
            type="button"
            onClick={() => handleClick(index)}
            disabled={!interactive}
            className={cn(
              "transition-colors",
              interactive && "cursor-pointer hover:scale-110",
              !interactive && "cursor-default"
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                isFilled && "fill-warning text-warning",
                isHalfFilled && "fill-warning/50 text-warning",
                !isFilled && !isHalfFilled && "text-muted-foreground/30",
                interactive && "hover:text-warning"
              )}
            />
          </button>
        );
      })}
    </div>
  );
};

interface RatingDisplayProps {
  rating: number | null;
  totalReviews: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
}

export const RatingDisplay = ({
  rating,
  totalReviews,
  size = 'md',
  showCount = true,
  className,
}: RatingDisplayProps) => {
  if (!rating || totalReviews === 0) {
    return (
      <div className={cn("flex items-center gap-1 text-muted-foreground", className)}>
        <StarRating rating={0} size={size} />
        <span className="text-sm">No reviews yet</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <StarRating rating={rating} size={size} />
      <span className="font-medium">{rating.toFixed(1)}</span>
      {showCount && (
        <span className="text-sm text-muted-foreground">
          ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  );
};

export default StarRating;
