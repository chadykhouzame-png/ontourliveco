import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Who is On Tour Live for?",
    a: "Two rooms of the same house. Artists — DJs, singers, live acts — turning travel dates into booked nights. Venues — bars, clubs, hotels — finding the acts already in town. No DMs, no scrambling.",
  },
  {
    q: "What does it cost?",
    a: "Creating a profile and browsing is free on both sides. On confirmed bookings we take a 5% platform fee, deducted at payout. Nothing before the show is done.",
  },
  {
    q: "How do bookings get paid?",
    a: "Payments run through Stripe Connect. Venues fund the booking on confirmation; funds are released to the artist after the night is marked complete. Both sides are protected by the same ledger.",
  },
  {
    q: "Can an artist and venue negotiate the fee?",
    a: "Yes — up to five rounds of counter-offers on a single request. Once both sides sign the terms the booking locks and the calendar updates for everyone.",
  },
  {
    q: "What if a night is cancelled?",
    a: "Cancellations follow the terms agreed at booking, with a documented reason. If something goes wrong on the night, either side can open a dispute — we review and rule within 72 hours.",
  },
  {
    q: "How do you keep the roster serious?",
    a: "Every profile is verified before it goes live. After each booking, both sides leave a private 1–5 review. Reputation is earned show by show — not by follower count.",
  },
  {
    q: "Do artists need to travel to be listed?",
    a: "No. Local acts are welcome. Travel dates simply surface you to venues in that city on those nights — it's a signal, not a requirement.",
  },
  {
    q: "How is my data handled?",
    a: "Contact details stay private until a booking is confirmed. Messaging happens inside the platform. We never sell your data. See the Privacy Policy for the long version.",
  },
];

const FAQ = () => {
  return (
    <section id="faq" className="bg-noir py-24 md:py-32 border-t border-border/40">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid md:grid-cols-12 gap-10 md:gap-16">
          {/* Editorial header — left column */}
          <div className="md:col-span-4">
            <p className="eyebrow mb-6">House Rules · Appendix</p>
            <h2 className="font-display uppercase tracking-display text-ivory text-4xl md:text-5xl leading-[1.05] mb-6">
              Questions,<br />answered<span className="text-champagne">.</span>
            </h2>
            <p className="font-accent italic text-ivory/70 text-lg leading-relaxed">
              The short version — before you write in.
            </p>
            <div aria-hidden className="mt-8 h-px w-16 bg-champagne/60" />
          </div>

          {/* Accordion — right column */}
          <div className="md:col-span-8">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="border-b border-border/40 first:border-t"
                >
                  <AccordionTrigger className="text-left py-6 hover:no-underline group">
                    <div className="flex items-baseline gap-5 pr-4">
                      <span className="font-mono text-[11px] tracking-[0.2em] text-champagne/70 shrink-0 pt-1">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-display uppercase tracking-[0.06em] text-ivory text-lg md:text-xl leading-snug group-hover:text-champagne transition-colors">
                        {item.q}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-[52px] pr-4 pb-6 text-ivory/70 text-base leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <p className="mt-10 text-sm text-smoke">
              Still curious? Write to{" "}
              <a
                href="mailto:hello@ontour.live"
                className="text-champagne hover:text-champagne/80 underline underline-offset-4 decoration-champagne/40"
              >
                hello@ontour.live
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
