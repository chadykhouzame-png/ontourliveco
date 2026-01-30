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
          className: 'bg-green-500/20 text-green-400 border-green-500/30',
        };
      case 'rejected':
        return {
          label: 'Needs Changes',
          icon: XCircle,
          className: 'bg-red-500/20 text-red-400 border-red-500/30',
        };
      case 'pending':
      default:
        return {
          label: 'Pending Review',
          icon: Clock,
          className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
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
