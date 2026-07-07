import { useState, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import LaunchCountdown from "@/components/LaunchCountdown";

/**
 * On Tour Live — Founding List holding page.
 * Heritage members' club aesthetic: bone field, pine action, ink text,
 * oxblood italic accents. Typography: Young Serif / Archivo / Instrument Serif.
 */
export default function FirstLight() {
  const [role, setRole] = useState<"artist" | "venue">("artist");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hint, setHint] = useState("App launches September 2026 · Sydney first");
  const [hintTone, setHintTone] = useState<"muted" | "ox">("muted");
  const [position, setPosition] = useState<number | null>(null);
  const [shareHint, setShareHint] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = email.trim();
    const first = firstName.trim();
    const last = lastName.trim();
    const artist = artistName.trim();
    const venue = venueName.trim();

    const required = role === "artist"
      ? [first, last, artist, value]
      : [first, last, venue, value];

    if (required.some((v) => !v) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setHint("Please fill in every field with a valid email.");
      setHintTone("ox");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("waitlist-signup", {
        body: {
          email: value,
          role,
          firstName: first,
          lastName: last,
          artistName: role === "artist" ? artist : "",
          venueName: role === "venue" ? venue : "",
        },
      });
      if (error) throw error;
      if (data?.position) {
        setPosition(data.position as number);
      } else if (data?.error === "rate_limited") {
        setHint("Too many attempts — try again in an hour.");
        setHintTone("ox");
      } else {
        throw new Error(data?.error ?? "signup_failed");
      }
    } catch (err) {
      console.error(err);
      setHint("Something went wrong. Try again in a moment.");
      setHintTone("ox");
    } finally {
      setSubmitting(false);
    }
  }

  async function onShare() {
    const data = {
      title: "On Tour Live",
      text: "Join the founding list. Members book first — launching September 2026, Sydney first.",
      url: typeof window !== "undefined" ? window.location.href : "",
    };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(data.url);
        setShareHint("Link copied.");
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className="cl-root">
      <style>{styles}</style>

      <header className="cl-bar">
        <Crest className="cl-mini" />
        <span className="cl-eyebrow">Sydney · MMXXVI</span>
      </header>

      <main className="cl-main">
        <Crest className="cl-mark" />

        <p className="cl-eyebrow cl-pine">On Tour Live</p>
        <h1 className="cl-wordmark">Join the founding list</h1>
        <p className="cl-aside">Members book first.</p>
        <p className="cl-descriptor">The booking app for artists &amp; venues</p>

        <LaunchCountdown />

        {position === null ? (
          <form className="cl-form" onSubmit={onSubmit} noValidate>
            <div className="cl-seg" role="group" aria-label="I am an">
              <button
                type="button"
                aria-pressed={role === "artist"}
                onClick={() => setRole("artist")}
              >
                Artist
              </button>
              <button
                type="button"
                aria-pressed={role === "venue"}
                onClick={() => setRole("venue")}
              >
                Venue
              </button>
            </div>
            <div className="cl-fields">
              {role === "artist" ? (
                <>
                  <input
                    className="cl-input"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    autoComplete="given-name"
                    required
                    aria-label="First name"
                  />
                  <input
                    className="cl-input"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    autoComplete="family-name"
                    required
                    aria-label="Last name"
                  />
                  <input
                    className="cl-input"
                    type="text"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    placeholder="Artist name"
                    autoComplete="nickname"
                    required
                    aria-label="Artist name"
                  />
                </>
              ) : (
                <>
                  <input
                    className="cl-input"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Full name"
                    autoComplete="name"
                    required
                    aria-label="Full name"
                  />
                  <input
                    className="cl-input"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    autoComplete="family-name"
                    required
                    aria-label="Last name"
                  />
                  <input
                    className="cl-input"
                    type="text"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="Venue name"
                    autoComplete="organization"
                    required
                    aria-label="Venue name"
                  />
                </>
              )}
              <input
                className="cl-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                required
                aria-label="Email address"
              />
            </div>
            <button className="cl-cta" type="submit" disabled={submitting}>
              {submitting ? "Holding your place…" : "Take your place"}
            </button>
            <p className="cl-hint" data-tone={hintTone}>{hint}</p>
          </form>
        ) : (
          <div className="cl-held" aria-live="polite">
            <div className="cl-rule" />
            <h2>You&rsquo;re on the list</h2>
            <div className="cl-num">No. {position}</div>
            <p className="cl-sub">of the founding list.</p>
            <p className="cl-sub cl-sub-quiet">
              App launches September 2026 · Sydney first.
              <br />
              Watch{" "}
              <a href="https://instagram.com/ontourlive" className="cl-link">
                @ontourlive
              </a>
              .
            </p>
            <button className="cl-ghost" onClick={onShare}>
              Move up the list — share your invite
            </button>
            <p className="cl-hint">{shareHint}</p>
          </div>
        )}
      </main>

      <footer className="cl-footer">
        <span className="cl-eyebrow">
          <a href="https://instagram.com/ontourlive" className="cl-footer-link">@ontourlive</a>
        </span>
        <span className="cl-eyebrow">The Founding List — MMXXVI</span>
      </footer>
    </div>
  );
}

/** Interlock-style crest: pine square with an inner circle. */
function Crest({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      role="img"
      aria-label="On Tour Live crest"
    >
      <rect
        x="8"
        y="8"
        width="104"
        height="104"
        rx="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <circle cx="60" cy="60" r="26" fill="currentColor" />
      <rect x="8" y="80" width="104" height="3" fill="currentColor" />
    </svg>
  );
}

const styles = `
.cl-root{
  --bone:#EFE8DA; --bone-lift:#F5F0E6;
  --pine:#21402C; --pine-deep:#182F20;
  --ink:#171512; --ox:#572B2B; --sand:#8E8570;
  --font-display:'Young Serif',serif;
  --font-accent:'Instrument Serif',serif;
  --font-body:'Archivo',sans-serif;
  background:var(--bone); color:var(--ink); font-family:var(--font-body); font-weight:500;
  min-height:100vh; display:flex; flex-direction:column; overflow-x:hidden; position:relative;
}
.cl-root ::selection{background:var(--pine);color:var(--bone)}

.cl-bar{
  display:flex;justify-content:space-between;align-items:center;
  padding:26px clamp(22px,5vw,54px);
  border-bottom:1px solid hsl(0 0% 9% / .14);
}
.cl-mini{width:26px;height:26px;color:var(--pine);flex:none}

.cl-eyebrow{
  font-family:var(--font-body);font-weight:700;font-size:11px;
  letter-spacing:.28em;text-transform:uppercase;color:var(--sand);
}
.cl-eyebrow.cl-pine{color:var(--pine)}
.cl-eyebrow a{color:inherit;text-decoration:none}
.cl-eyebrow a:hover{color:var(--pine)}

.cl-main{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;padding:48px clamp(22px,6vw,60px) 56px;
}
.cl-mark{width:clamp(72px,10vw,96px);color:var(--pine);margin-bottom:clamp(24px,4vh,36px)}

.cl-wordmark{
  font-family:var(--font-display);font-weight:400;
  font-size:clamp(38px,7vw,64px);line-height:1.05;letter-spacing:.02em;
  color:var(--ink);margin:14px 0 0;max-width:14ch;
}
.cl-aside{
  font-family:var(--font-accent);font-style:italic;
  font-size:clamp(20px,2.4vw,26px);color:var(--ox);
  margin-top:14px;
}
.cl-descriptor{
  font-family:var(--font-body);font-weight:700;font-size:11px;
  letter-spacing:.28em;text-transform:uppercase;color:var(--sand);
  margin-top:18px;
}

.cl-form{margin-top:clamp(34px,5vh,48px);width:min(440px,100%)}
.cl-fields{display:flex;flex-direction:column;gap:12px}

.cl-seg{
  display:flex;border:1.5px solid var(--pine);border-radius:999px;
  overflow:hidden;margin-bottom:20px;background:var(--bone-lift);
}
.cl-seg button{
  flex:1;background:transparent;border:0;color:var(--pine);
  font-family:var(--font-body);font-weight:700;font-size:11px;
  letter-spacing:.28em;text-transform:uppercase;
  padding:14px 0;cursor:pointer;transition:background .2s,color .2s;
}
.cl-seg button[aria-pressed="true"]{background:var(--pine);color:var(--bone)}
.cl-seg button:focus-visible,
.cl-form input:focus-visible,
.cl-cta:focus-visible,
.cl-ghost:focus-visible{outline:2px solid var(--pine);outline-offset:3px}

.cl-form input.cl-input{
  width:100%;background:var(--bone-lift);
  border:1px solid hsl(0 0% 9% / .14);border-radius:999px;
  color:var(--ink);font-family:var(--font-body);font-weight:500;font-size:15px;
  padding:14px 20px;text-align:center;letter-spacing:.02em;
  transition:border-color .2s;
}
.cl-form input.cl-input::placeholder{color:var(--sand)}
.cl-form input.cl-input:focus{border-color:var(--pine);outline:none}

.cl-cta{
  margin-top:22px;width:100%;background:var(--pine);color:var(--bone);
  border:0;border-radius:999px;
  font-family:var(--font-body);font-weight:700;font-size:12px;
  letter-spacing:.28em;text-transform:uppercase;
  padding:16px 0;cursor:pointer;transition:background .2s,transform .1s;
}
.cl-cta:hover{background:var(--pine-deep)}
.cl-cta:active{transform:translateY(1px)}
.cl-cta:disabled{opacity:.55;cursor:not-allowed}

.cl-hint{
  font-family:var(--font-body);font-size:11.5px;color:var(--sand);
  letter-spacing:.04em;margin-top:16px;min-height:14px;
}
.cl-hint[data-tone="ox"]{color:var(--ox);font-family:var(--font-accent);font-style:italic;font-size:14px}

.cl-held{margin-top:clamp(34px,5vh,48px);max-width:460px}
.cl-rule{width:56px;height:1px;background:var(--pine);opacity:.8;margin:0 auto 22px}
.cl-held h2{
  font-family:var(--font-display);font-weight:400;
  font-size:clamp(28px,4vw,38px);letter-spacing:.02em;color:var(--ink);
  margin:0;
}
.cl-num{
  font-family:var(--font-display);font-size:clamp(56px,9vw,84px);
  color:var(--ink);line-height:1.05;margin:14px 0 6px;
}
.cl-sub{font-family:var(--font-accent);font-style:italic;color:var(--ox);font-size:18px;margin:6px 0 0}
.cl-sub-quiet{
  font-family:var(--font-body);font-style:normal;font-weight:500;
  color:var(--sand);font-size:13.5px;letter-spacing:.04em;line-height:1.7;
  margin-top:14px;
}
.cl-link{color:var(--pine);font-weight:700;text-decoration:none}
.cl-link:hover{text-decoration:underline}

.cl-ghost{
  display:inline-block;margin-top:26px;background:transparent;color:var(--pine);
  border:1.5px solid var(--pine);border-radius:999px;
  font-family:var(--font-body);font-weight:700;font-size:11px;
  letter-spacing:.28em;text-transform:uppercase;
  padding:14px 26px;cursor:pointer;transition:background .2s,color .2s;
}
.cl-ghost:hover{background:var(--pine);color:var(--bone)}

.cl-footer{
  display:flex;justify-content:space-between;align-items:center;
  padding:24px clamp(22px,5vw,54px);
  border-top:1px solid hsl(0 0% 9% / .14);
}
.cl-footer-link{color:var(--sand);text-decoration:none}
.cl-footer-link:hover{color:var(--pine)}

/* Countdown restyled to club aesthetic (uses fl-* class hooks in LaunchCountdown) */
.fl-countdown{margin-top:clamp(24px,4vh,32px);display:flex;flex-direction:column;align-items:center;gap:8px}
.fl-cd-grid{display:flex;align-items:flex-start;justify-content:center;gap:clamp(10px,1.6vw,16px)}
.fl-cd-unit{display:flex;flex-direction:column;align-items:center;min-width:clamp(46px,7vw,60px)}
.fl-cd-num{
  font-family:var(--font-display);font-weight:400;
  font-size:clamp(28px,4.4vw,38px);color:var(--ink);line-height:1;
  letter-spacing:.02em;font-variant-numeric:tabular-nums;
}
.fl-cd-label{
  margin-top:6px;font-family:var(--font-body);font-weight:700;font-size:9.5px;
  letter-spacing:.28em;color:var(--sand);text-transform:uppercase;
}
.fl-cd-sep{
  font-family:var(--font-display);font-size:clamp(22px,3.4vw,32px);
  color:var(--pine);opacity:.55;line-height:1;transform:translateY(2px);
}
.fl-cd-cap{
  font-family:var(--font-accent);font-style:italic;font-size:14px;
  color:var(--ox);letter-spacing:.02em;margin-top:2px;
}
.fl-live{
  font-family:var(--font-display);font-size:clamp(22px,3.4vw,30px);
  letter-spacing:.02em;color:var(--pine);margin:0;
}

@media (prefers-reduced-motion: no-preference){
  .cl-mark,.cl-wordmark,.cl-aside,.cl-descriptor,.cl-form,.cl-held,.fl-countdown{
    opacity:0;transform:translateY(8px);animation:cl-rise .7s ease-out forwards
  }
  .cl-mark{animation-delay:.05s}
  .cl-wordmark{animation-delay:.25s}
  .cl-aside{animation-delay:.45s}
  .cl-descriptor{animation-delay:.6s}
  .fl-countdown{animation-delay:.75s}
  .cl-form,.cl-held{animation-delay:.9s}
  @keyframes cl-rise{to{opacity:1;transform:translateY(0)}}
}
`;
