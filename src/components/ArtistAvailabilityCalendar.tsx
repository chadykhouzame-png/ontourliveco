import { useMemo, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, MapPin, Check, X } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { TravelDate } from '@/types/database';
import { cn } from '@/lib/utils';

interface ArtistAvailabilityCalendarProps {
  travelDates: TravelDate[];
  artistName: string;
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date;
}

const ArtistAvailabilityCalendar = ({ 
  travelDates, 
  artistName,
  onDateSelect,
  selectedDate 
}: ArtistAvailabilityCalendarProps) => {
  const [viewDate, setViewDate] = useState<Date>(new Date());

  // Create modifiers for calendar styling
  const modifiers = useMemo(() => {
    const availableDates: Date[] = [];
    const unavailableDates: Date[] = [];
    
    travelDates.forEach(travel => {
      const start = parseISO(travel.start_date);
      const end = parseISO(travel.end_date);
      let current = new Date(start);
      
      while (current <= end) {
        if (travel.is_available) {
          availableDates.push(new Date(current));
        } else {
          unavailableDates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }
    });
    
    return {
      available: availableDates,
      unavailable: unavailableDates,
    };
  }, [travelDates]);

  const modifiersStyles = {
    available: {
      backgroundColor: 'hsl(var(--artist) / 0.2)',
      border: '2px solid hsl(var(--artist))',
      borderRadius: '6px',
    },
    unavailable: {
      backgroundColor: 'hsl(var(--muted))',
      color: 'hsl(var(--muted-foreground))',
      borderRadius: '6px',
      opacity: 0.5,
    },
  };

  // Get info for selected date
  const selectedDateInfo = useMemo(() => {
    if (!selectedDate) return null;
    
    const travelDate = travelDates.find(td => {
      const start = startOfDay(parseISO(td.start_date));
      const end = endOfDay(parseISO(td.end_date));
      return isWithinInterval(selectedDate, { start, end });
    });
    
    return travelDate;
  }, [selectedDate, travelDates]);

  const handleSelect = (date: Date | undefined) => {
    if (date && onDateSelect) {
      onDateSelect(date);
    }
  };

  return (
    <Card className="glass border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-border/30 bg-secondary/20">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-xl bg-artist/20 flex items-center justify-center">
            <CalendarIcon className="w-4 h-4 text-artist" />
          </div>
          Availability Calendar
        </CardTitle>
        <CardDescription>
          See when {artistName} is available for bookings
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Calendar */}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            month={viewDate}
            onMonthChange={setViewDate}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            disabled={(date) => date < new Date()}
            className="rounded-xl border border-border/50 p-3 pointer-events-auto"
          />
          
          {/* Legend */}
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-artist bg-artist/20" />
              <span className="text-xs text-muted-foreground">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted opacity-50" />
              <span className="text-xs text-muted-foreground">Busy</span>
            </div>
          </div>

          {/* Selected date info */}
          {selectedDate && (
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
              <h4 className="font-semibold mb-2">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h4>
              
              {selectedDateInfo ? (
                <div className={cn(
                  "p-3 rounded-lg border",
                  selectedDateInfo.is_available 
                    ? "bg-artist/10 border-artist/30" 
                    : "bg-muted/50 border-border/30"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className={cn(
                      "w-4 h-4",
                      selectedDateInfo.is_available ? "text-artist" : "text-muted-foreground"
                    )} />
                    <span className="font-medium">{selectedDateInfo.city}</span>
                    {selectedDateInfo.is_available ? (
                      <Badge className="ml-auto bg-artist/20 text-artist border-0 text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="ml-auto text-muted-foreground text-xs">
                        <X className="w-3 h-3 mr-1" />
                        Busy
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(selectedDateInfo.start_date), 'MMM d')} – {format(parseISO(selectedDateInfo.end_date), 'MMM d, yyyy')}
                  </p>
                  {selectedDateInfo.notes && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      "{selectedDateInfo.notes}"
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No travel dates listed for this day. Contact the artist to check availability.
                </p>
              )}
            </div>
          )}

          {/* Upcoming available dates summary */}
          {travelDates.filter(td => td.is_available && new Date(td.end_date) >= new Date()).length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-muted-foreground">
                Upcoming Available Dates
              </h5>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {travelDates
                  .filter(td => td.is_available && new Date(td.end_date) >= new Date())
                  .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                  .map((td) => (
                    <button
                      key={td.id}
                      onClick={() => {
                        const date = parseISO(td.start_date);
                        setViewDate(date);
                        if (onDateSelect) onDateSelect(date);
                      }}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-all duration-200 haptic",
                        "border-artist/30 bg-artist/5 hover:bg-artist/10"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-artist" />
                          <span className="font-medium text-sm">{td.city}</span>
                        </div>
                        <Badge variant="outline" className="text-xs border-artist text-artist">
                          Available
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(td.start_date), 'MMM d')} – {format(parseISO(td.end_date), 'MMM d, yyyy')}
                      </p>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ArtistAvailabilityCalendar;
