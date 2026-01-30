import { useMemo, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, MapPin, Music } from 'lucide-react';
import { format, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { TravelDate, BookingRequest, BOOKING_STATUS_LABELS } from '@/types/database';
import { cn } from '@/lib/utils';

interface ArtistCalendarProps {
  travelDates: TravelDate[];
  bookingRequests: BookingRequest[];
}

const ArtistCalendar = ({ travelDates, bookingRequests }: ArtistCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Get accepted/completed bookings only
  const confirmedBookings = useMemo(() => 
    bookingRequests.filter(b => b.status === 'accepted' || b.status === 'completed'),
    [bookingRequests]
  );

  // Create a map of dates to their events
  const dateEvents = useMemo(() => {
    const events: Record<string, { type: 'booking' | 'travel'; data: BookingRequest | TravelDate }[]> = {};
    
    // Add bookings
    confirmedBookings.forEach(booking => {
      const dateKey = booking.requested_date;
      if (!events[dateKey]) events[dateKey] = [];
      events[dateKey].push({ type: 'booking', data: booking });
    });
    
    // Add travel dates (they span multiple days)
    travelDates.forEach(travel => {
      const start = parseISO(travel.start_date);
      const end = parseISO(travel.end_date);
      let current = new Date(start);
      
      while (current <= end) {
        const dateKey = format(current, 'yyyy-MM-dd');
        if (!events[dateKey]) events[dateKey] = [];
        // Only add once per travel period
        if (!events[dateKey].some(e => e.type === 'travel' && (e.data as TravelDate).id === travel.id)) {
          events[dateKey].push({ type: 'travel', data: travel });
        }
        current.setDate(current.getDate() + 1);
      }
    });
    
    return events;
  }, [confirmedBookings, travelDates]);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return dateEvents[dateKey] || [];
  }, [selectedDate, dateEvents]);

  // Custom day renderer to show indicators
  const modifiers = useMemo(() => {
    const bookingDates: Date[] = [];
    const travelDatesList: Date[] = [];
    
    confirmedBookings.forEach(booking => {
      bookingDates.push(parseISO(booking.requested_date));
    });
    
    travelDates.forEach(travel => {
      const start = parseISO(travel.start_date);
      const end = parseISO(travel.end_date);
      let current = new Date(start);
      
      while (current <= end) {
        travelDatesList.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    });
    
    return {
      booking: bookingDates,
      travel: travelDatesList,
    };
  }, [confirmedBookings, travelDates]);

  const modifiersStyles = {
    booking: {
      backgroundColor: 'hsl(var(--artist))',
      color: 'white',
      borderRadius: '50%',
    },
    travel: {
      backgroundColor: 'hsl(var(--primary) / 0.2)',
      border: '2px solid hsl(var(--primary))',
    },
  };

  return (
    <Card className="glass border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-border/30 bg-secondary/20">
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-artist" />
          Your Calendar
        </CardTitle>
        <CardDescription>
          Bookings and travel dates at a glance
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Calendar */}
          <div className="flex-1">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="rounded-xl border border-border/50 p-3 pointer-events-auto"
            />
            
            {/* Legend */}
            <div className="flex gap-4 mt-4 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-artist" />
                <span className="text-xs text-muted-foreground">Gig</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-primary bg-primary/20" />
                <span className="text-xs text-muted-foreground">On Tour</span>
              </div>
            </div>
          </div>
          
          {/* Selected date details */}
          <div className="flex-1 min-w-[250px]">
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 h-full">
              <h4 className="font-semibold mb-3">
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
              </h4>
              
              {selectedDateEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events on this day</p>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map((event, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "p-3 rounded-lg border",
                        event.type === 'booking' 
                          ? "bg-artist/10 border-artist/30" 
                          : "bg-primary/10 border-primary/30"
                      )}
                    >
                      {event.type === 'booking' ? (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <Music className="w-4 h-4 text-artist" />
                            <span className="font-medium text-sm">Gig</span>
                            <Badge variant="outline" className="text-xs ml-auto">
                              {BOOKING_STATUS_LABELS[(event.data as BookingRequest).status]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            at {(event.data as BookingRequest).venue?.venue_name || 'Venue'}
                          </p>
                          {(event.data as BookingRequest).requested_time && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {(event.data as BookingRequest).requested_time}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm">On Tour</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {(event.data as TravelDate).city}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(parseISO((event.data as TravelDate).start_date), 'MMM d')} - {format(parseISO((event.data as TravelDate).end_date), 'MMM d')}
                          </p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ArtistCalendar;
