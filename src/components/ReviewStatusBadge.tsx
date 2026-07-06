import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

interface ReviewStatusBadgeProps {
  status: string;
}

const ReviewStatusBadge = ({ status }: ReviewStatusBadgeProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'approved':
        return {
          label: 'Approved',
          icon: CheckCircle,
          className: 'bg-success/20 text-success border-success/30',
        };
      case 'rejected':
        return {
          label: 'Needs Changes',
          icon: XCircle,
          className: 'bg-danger/20 text-danger border-danger/30',
        };
      case 'pending':
      default:
        return {
          label: 'Pending Review',
          icon: Clock,
          className: 'bg-warning/20 text-warning border-warning/30',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} gap-1.5`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};

export default ReviewStatusBadge;
