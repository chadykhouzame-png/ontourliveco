import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BookingStatus } from '@/types/database';

export type StatusFilter = 'all' | BookingStatus;

interface BookingStatusFilterProps {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
  counts: {
    all: number;
    pending: number;
    accepted: number;
    completed: number;
    declined: number;
    cancelled: number;
  };
}

export function BookingStatusFilter({ value, onChange, counts }: BookingStatusFilterProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as StatusFilter)} className="w-full">
      <TabsList className="w-full grid grid-cols-6 h-auto p-1 bg-secondary/50">
        <TabsTrigger 
          value="all" 
          className="text-xs sm:text-sm py-1.5 data-[state=active]:bg-background"
        >
          All
          {counts.all > 0 && (
            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
              {counts.all}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger 
          value="pending" 
          className="text-xs sm:text-sm py-1.5 data-[state=active]:bg-background"
        >
          Pending
          {counts.pending > 0 && (
            <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-xs animate-pulse">
              {counts.pending}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger 
          value="accepted" 
          className="text-xs sm:text-sm py-1.5 data-[state=active]:bg-background"
        >
          Accepted
          {counts.accepted > 0 && (
            <Badge className="ml-1.5 h-5 px-1.5 text-xs bg-primary/80">
              {counts.accepted}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger 
          value="completed" 
          className="text-xs sm:text-sm py-1.5 data-[state=active]:bg-background"
        >
          Done
          {counts.completed > 0 && (
            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
              {counts.completed}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger 
          value="declined" 
          className="text-xs sm:text-sm py-1.5 data-[state=active]:bg-background"
        >
          Declined
          {counts.declined > 0 && (
            <Badge variant="outline" className="ml-1.5 h-5 px-1.5 text-xs">
              {counts.declined}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger 
          value="cancelled" 
          className="text-xs sm:text-sm py-1.5 data-[state=active]:bg-background"
        >
          Cancelled
          {counts.cancelled > 0 && (
            <Badge variant="outline" className="ml-1.5 h-5 px-1.5 text-xs">
              {counts.cancelled}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
