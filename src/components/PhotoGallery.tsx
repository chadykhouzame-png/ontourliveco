import g1 from "@/assets/gallery-1.jpg";
import g2 from "@/assets/gallery-2.jpg";
import g3 from "@/assets/gallery-3.jpg";
import g4 from "@/assets/gallery-4.jpg";
import g5 from "@/assets/gallery-5.jpg";
import g6 from "@/assets/gallery-6.jpg";

type Frame = {
  src: string;
  alt: string;
  caption: string;
  meta: string;
  span: string;
  ratio: string;
  w: number;
  h: number;
};

const frames: Frame[] = [
  {
    src: g1,
    alt: "DJ silhouette behind decks in warm amber light",
    caption: "The room, at pitch.",
    meta: "Booth · 01:14",
    span: "md:col-span-4 md:row-span-2",
    ratio: "aspect-[4/5]",
    w: 1280,
    h: 1600,
  },
  {
    src: g2,
    alt: "Crowd with raised hands in warm stage haze",
    caption: "Three hundred, in unison.",
    meta: "Floor · Peak",
    span: "md:col-span-8",
    ratio: "aspect-[16/10]",
    w: 1600,
    h: 1200,
  },
  {
    src: g3,
    alt: "Vintage brass microphone under a warm spotlight",
    caption: "Every night begins here.",
    meta: "Stage · Doors 10pm",
    span: "md:col-span-4",
    ratio: "aspect-square",
    w: 1280,
    h: 1280,
  },
  {
    src: g4,
    alt: "Empty intimate club interior lit by warm sconces",
    caption: "The hour before the room fills.",
    meta: "House · 21:47",
    span: "md:col-span-4",
    ratio: "aspect-[4/3]",
    w: 1600,
    h: 1200,
  },
  {
    src: g5,
    alt: "Singer silhouetted by a single warm spotlight",
    caption: "One voice, one light.",
    meta: "Headline · Set two",
    span: "md:col-span-4 md:row-span-2",
    ratio: "aspect-[4/5]",
    w: 1280,
    h: 1600,
  },
  {
    src: g6,
    alt: "Crystal glassware on a bar lit by warm pendants",
    caption: "Old fashioned, served correctly.",
    meta: "Bar · Between sets",
    span: "md:col-span-8",
    ratio: "aspect-[16/10]",
    w: 1600,
    h: 1200,
  },
];

const PhotoGallery = () => {
  return (
    <section id="gallery" className="bg-noir py-24 md:py-32 border-t border-border/40">
      <div className="max-w-7xl mx-auto px-6">
        {/* Editorial header */}
        <div className="max-w-2xl mb-16 md:mb-20">
          <p className="eyebrow mb-6">Field Notes · Vol. 01</p>
          <h2 className="font-display uppercase tracking-display text-ivory text-4xl md:text-5xl lg:text-6xl leading-[1.05] mb-6">
            After the doors<span className="text-champagne">.</span>
          </h2>
          <p className="editorial text-lg md:text-xl text-ivory/70 max-w-xl">
            A ledger of rooms, lit warm — captured between soundcheck and last call.
          </p>
        </div>

        {/* Editorial mosaic */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          {frames.map((f, i) => (
            <figure
              key={i}
              className={`group relative overflow-hidden bg-noir ${f.span}`}
            >
              <div className={`relative w-full ${f.ratio} overflow-hidden`}>
                <img
                  src={f.src}
                  alt={f.alt}
                  loading="lazy"
                  width={f.w}
                  height={f.h}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
                />
                {/* Warm base + noir foot for caption legibility */}
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-noir via-noir/20 to-transparent"
                />
                {/* Hairline plate */}
                <div aria-hidden className="absolute inset-2 border border-champagne/10 pointer-events-none" />
              </div>

              {/* Light editorial caption */}
              <figcaption className="absolute left-0 right-0 bottom-0 p-5 md:p-6 flex items-end justify-between gap-4">
                <div>
                  <p className="font-accent italic text-ivory text-lg md:text-xl leading-snug">
                    {f.caption}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-ivory/50">
                    {f.meta}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] tracking-[0.2em] text-champagne/70">
                  {String(i + 1).padStart(2, "0")} / {String(frames.length).padStart(2, "0")}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Colophon */}
        <div className="mt-14 md:mt-16 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-smoke text-xs uppercase tracking-[0.22em] border-t border-border/30 pt-6">
          <span>Photography — House archive</span>
          <span>Warm tungsten · 3200K</span>
          <span>On Tour Live · MMXXVI</span>
        </div>
      </div>
    </section>
  );
};

export default PhotoGallery;
