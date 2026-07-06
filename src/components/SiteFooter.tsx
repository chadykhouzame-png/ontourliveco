import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { socialLinks } from "@/config/social";
import { BrandLockup } from "@/components/BrandLockup";

const nav = {
  Platform: [
    { label: "How it works", href: "#how-it-works" },
    { label: "For Artists", href: "#for-artists" },
    { label: "For Venues", href: "#for-venues" },
    { label: "Browse", href: "/search", isRoute: true },
  ],
  House: [
    { label: "Field Notes", href: "#gallery" },
    { label: "Upcoming Nights", href: "#events" },
    { label: "Join the list", href: "#join" },
    { label: "FAQ", href: "#faq" },
  ],
  Legal: [
    { label: "Terms of Service", href: "/terms", isRoute: true },
    { label: "Privacy Policy", href: "/privacy", isRoute: true },
    { label: "Contact", href: "mailto:hello@ontour.live" },
  ],
};

const socials = [
  {
    key: "instagram",
    ...socialLinks.instagram,
    path: (
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
      />
    ),
  },
  {
    key: "facebook",
    ...socialLinks.facebook,
    path: (
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
      />
    ),
  },
  {
    key: "tiktok",
    ...socialLinks.tiktok,
    path: (
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    ),
  },
  {
    key: "twitter",
    ...socialLinks.twitter,
    path: (
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    ),
  },
  {
    key: "linkedin",
    ...socialLinks.linkedin,
    path: (
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    ),
  },
] as const;

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-noir border-t border-border/40 overflow-hidden">
      {/* Warm champagne glow — anchor at the base */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 h-[420px] w-[720px] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(var(--champagne) / 0.4) 0%, transparent 70%)" }}
      />

      {/* Hairline corner marks */}
      <div aria-hidden className="absolute top-6 left-6 md:left-10 w-6 h-6 border-l border-t border-champagne/40" />
      <div aria-hidden className="absolute top-6 right-6 md:right-10 w-6 h-6 border-r border-t border-champagne/40" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-10">
        {/* Top: brand + tagline + nav */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-10">
          {/* Brand column */}
          <div className="md:col-span-5">
            <BrandLockup size="md" className="mb-6" />


            <p className="font-accent italic text-ivory/80 text-xl leading-snug max-w-sm mb-6">
              The stage awaits.
            </p>
            <p className="text-smoke text-sm leading-relaxed max-w-sm mb-8">
              Venues find the artists already in town. Artists turn travel dates
              into booked nights. Warmly hosted, quietly run.
            </p>

            {/* Socials */}
            <div className="flex items-center gap-3">
              {socials.map((s) => (
                <a
                  key={s.key}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-10 h-10 rounded-full border border-border/60 flex items-center justify-center text-ivory/70 hover:text-champagne hover:border-champagne/60 transition-all duration-300"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    {s.path}
                  </svg>
                </a>
              ))}
              <a
                href={socialLinks.email.url}
                aria-label={socialLinks.email.label}
                className="w-10 h-10 rounded-full border border-border/60 flex items-center justify-center text-ivory/70 hover:text-champagne hover:border-champagne/60 transition-all duration-300"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Nav columns */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {Object.entries(nav).map(([title, links]) => (
              <div key={title}>
                <p className="eyebrow mb-5">{title}</p>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      {"isRoute" in link && link.isRoute ? (
                        <Link
                          to={link.href}
                          className="text-ivory/70 hover:text-champagne text-sm transition-colors"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          className="text-ivory/70 hover:text-champagne text-sm transition-colors"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Divider rule */}
        <div className="mt-16 mb-8 flex items-center gap-6">
          <div className="h-px flex-1 bg-border/40" />
          <span className="font-display uppercase tracking-[0.3em] text-champagne/70 text-xs">
            On Tour · Live
          </span>
          <div className="h-px flex-1 bg-border/40" />
        </div>

        {/* Bottom row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs uppercase tracking-[0.22em] text-smoke">
          <p>© {year} On Tour Live · All rights reserved</p>
          <p>Made warmly · Room, sound, show</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
