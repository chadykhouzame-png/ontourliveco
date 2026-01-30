import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Music, DollarSign, Clock, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Genre, GENRE_LABELS } from '@/types/database';

const ALL_GENRES: Genre[] = [
  'house', 'techno', 'disco', 'hip_hop', 'rnb', 'afrobeats', 'amapiano',
  'latin', 'pop', 'rock', 'jazz', 'soul', 'funk', 'drum_and_bass',
  'uk_garage', 'reggae', 'dancehall', 'other'
];

const formSchema = z.object({
  requested_date: z.date({
    required_error: 'Please select a date',
  }),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().optional(),
  budget_min: z.number().min(0).optional(),
  budget_max: z.number().min(0).optional(),
  description: z.string().min(10, 'Please provide a brief description (at least 10 characters)'),
  requirements: z.string().optional(),
  preferred_genres: z.array(z.string()).min(1, 'Select at least one genre'),
});

type FormValues = z.infer<typeof formSchema>;

interface EntertainmentRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueId: string;
  venueName: string;
  venueGenres?: Genre[];
  onRequestCreated?: () => void;
}

export default function EntertainmentRequestDialog({
  open,
  onOpenChange,
  venueId,
  venueName,
  venueGenres = [],
  onRequestCreated,
}: EntertainmentRequestDialogProps) {
  const { toast } = useToast();
  const { showError } = useErrorHandler();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      start_time: '',
      end_time: '',
      description: '',
      requirements: '',
      preferred_genres: venueGenres,
    },
  });

  const selectedGenres = form.watch('preferred_genres') || [];

  const toggleGenre = (genre: string) => {
    const current = form.getValues('preferred_genres') || [];
    if (current.includes(genre)) {
      form.setValue('preferred_genres', current.filter(g => g !== genre));
    } else {
      form.setValue('preferred_genres', [...current, genre]);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      // Create the entertainment request
      const { data: request, error: requestError } = await supabase
        .from('entertainment_requests')
        .insert({
          venue_id: venueId,
          requested_date: format(values.requested_date, 'yyyy-MM-dd'),
          start_time: values.start_time,
          end_time: values.end_time || null,
          budget_min: values.budget_min || null,
          budget_max: values.budget_max || null,
          description: values.description,
          requirements: values.requirements || null,
          preferred_genres: values.preferred_genres as Genre[],
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Call edge function to notify matching artists
      const { error: notifyError } = await supabase.functions.invoke('notify-artists', {
        body: {
          entertainment_request_id: request.id,
          venue_id: venueId,
          venue_name: venueName,
          requested_date: format(values.requested_date, 'yyyy-MM-dd'),
          start_time: values.start_time,
          end_time: values.end_time,
          budget_min: values.budget_min,
          budget_max: values.budget_max,
          description: values.description,
          preferred_genres: values.preferred_genres,
        },
      });

      if (notifyError) {
        console.error('Error notifying artists:', notifyError);
        // Don't fail the whole request if notifications fail
      }

      toast({
        title: 'Request sent!',
        description: 'Genre-matched artists have been notified about your entertainment slot.',
      });

      form.reset();
      onOpenChange(false);
      onRequestCreated?.();
    } catch (error: unknown) {
      showError(error, 'creating entertainment request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto glass border-border/50 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-venue/20 flex items-center justify-center">
              <Music className="w-4 h-4 text-venue" />
            </div>
            Fill an Entertainment Slot
          </DialogTitle>
          <DialogDescription>
            Create a request and notify genre-matched artists who are available on your selected date.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Date */}
            <FormField
              control={form.control}
              name="requested_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Event Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Start Time
                    </FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time (optional)</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Budget Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budget_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Min Budget
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="500"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="budget_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Budget</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1500"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Preferred Genres */}
            <FormField
              control={form.control}
              name="preferred_genres"
              render={() => (
                <FormItem>
                  <FormLabel>Preferred Genres</FormLabel>
                  <FormDescription>
                    Artists matching these genres will be notified
                  </FormDescription>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ALL_GENRES.map((genre) => (
                      <Badge
                        key={genre}
                        variant={selectedGenres.includes(genre) ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer transition-all',
                          selectedGenres.includes(genre) && 'bg-venue text-venue-foreground'
                        )}
                        onClick={() => toggleGenre(genre)}
                      >
                        {GENRE_LABELS[genre]}
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Event Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the event, vibe, and what you're looking for..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Requirements */}
            <FormField
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Requirements (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Equipment needs, set length, any special requests..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 haptic glass-subtle"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-venue hover:bg-venue/90 haptic shadow-lg shadow-venue/20"
              >
                {isSubmitting ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
