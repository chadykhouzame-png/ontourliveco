import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Event = {
  date: string;      // e.g. "Fri 12 Sep"
  city: string;
  venue: string;
  billing: string;   // headline act / theme
  doors: string;     // e.g. "10:00 PM"
  capacity: number;
  note?: string;     // editorial line
};

const events: Event[] = [
  {
    date: "Fri · 12 Sep",
    city: "New York, NY",
    venue: "The Standard Room",
    billing: "Kaia Rose · Live Set",
    doors: "10:00 PM",
    capacity: 320,
    note: "Late set, full backline.",
  },
  {
    date: "Sat · 20 Sep",
    city: "Miami, FL",
    venue: "Palma Rooftop",
    billing: "DJ Halcyon b2b Mira",
    doors: "9:30 PM",
    capacity: 480,
    note: "Sunset to sunrise.",
  },
  {
    date: "Thu · 03 Oct",
    city: "Los Angeles, CA",
    venue: "The Velvet Sessions",
    billing: "Ari Levine Trio",
    doors: "8:00 PM",
    capacity: 180,
    note: "Seated, listening room.",
  },
];

const EventHighlights = () => {
  return (
    <section id="events" className="relative bg-noir-lift border-t border-border/40 py-24">
      {/* Hairline corner marks */}
      <div aria-hidden className="absolute top-8 left-6 md:left-10 w-6 h-6 border-l border-t border-champagne/40" />
      <div aria-hidden className="absolute top-8 right-6 md:right-10 w-6 h-6 border-r border-t border-champagne/40" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="eyebrow mb-4">Upcoming · Selected Dates</p>
          <h2 className="font-display uppercase tracking-display text-ivory text-3xl md:text-5xl mb-4">
            Nights on the calendar
          </h2>
          <p className="editorial text-lg md:text-xl">The rooms are quiet — for now.</p>
        </div>

        <ul className="divide-y divide-border/60 border-y border-border/60">
          {events.map((e, i) => (
            <li
              key={i}
              className="group grid grid-cols-12 gap-4 md:gap-6 items-center py-6 md:py-8 px-2 md:px-4 hover:bg-champagne/[0.03] transition-colors"
            >
              {/* Index */}
              <div className="hidden md:block col-span-1 text-xs text-smoke tracking-label">
                {String(i + 1).padStart(2, "0")}
              </div>

              {/* Date */}
              <div className="col-span-5 md:col-span-2">
                <div className="text-xs text-champagne uppercase tracking-label mb-1">Date</div>
                <div className="font-display text-ivory text-lg md:text-xl tracking-display">
                  {e.date}
                </div>
              </div>

              {/* Venue / city */}
              <div className="col-span-7 md:col-span-4">
                <div className="text-xs text-smoke uppercase tracking-label mb-1">
                  {e.city}
                </div>
                <div className="text-ivory text-base md:text-lg">{e.venue}</div>
                {e.note && (
                  <div className="editorial text-sm mt-1 hidden md:block">{e.note}</div>
                )}
              </div>

              {/* Billing */}
              <div className="col-span-6 md:col-span-2">
                <div className="text-xs text-smoke uppercase tracking-label mb-1">Billing</div>
                <div className="text-ivory text-sm md:text-base">{e.billing}</div>
              </div>

              {/* Doors + capacity */}
              <div className="col-span-6 md:col-span-2 flex md:flex-col md:items-start gap-4 md:gap-1">
                <div>
                  <div className="text-xs text-smoke uppercase tracking-label mb-1">Doors</div>
                  <div className="text-ivory text-sm md:text-base tabular-nums">{e.doors}</div>
                </div>
                <div>
                  <div className="text-xs text-smoke uppercase tracking-label mb-1">Cap.</div>
                  <div className="text-ivory text-sm md:text-base tabular-nums">
                    {e.capacity.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="col-span-12 md:col-span-1 flex md:justify-end mt-2 md:mt-0">
                <Link to="/join/venue" aria-label={`Book ${e.date} at ${e.venue}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border border-champagne text-ivory bg-transparent hover:bg-champagne/10 hover:text-ivory rounded-brand uppercase tracking-[0.08em] text-xs shadow-none"
                  >
                    Book
                  </Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/join/venue">
            <Button
              size="lg"
              className="bg-champagne text-noir hover:bg-champagne-deep hover:text-ivory rounded-brand px-8 tracking-[0.08em] uppercase font-semibold shadow-none"
            >
              Book the night
            </Button>
          </Link>
          <Link
            to="/search"
            className="text-sm text-smoke hover:text-champagne underline-offset-4 hover:underline transition-colors"
          >
            See all upcoming dates →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default EventHighlights;
