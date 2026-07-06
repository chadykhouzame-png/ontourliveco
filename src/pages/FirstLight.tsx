import { useState, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import stageBg from "@/assets/fl-stage-bg.jpg";
import LaunchCountdown from "@/components/LaunchCountdown";

/**
 * First Light — On Tour Live waitlist landing page.
 * Design is locked to the brand direction supplied by the founder:
 * dark noir, champagne gold disc, Italiana/Cormorant/Outfit typography,
 * "first light" entrance animation, artist/venue segmentation.
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
  const [hintTone, setHintTone] = useState<"muted" | "gold">("muted");
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
      setHint("Please fill in all fields with a valid email.");
      setHintTone("gold");
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
        setHintTone("gold");
      } else {
        throw new Error(data?.error ?? "signup_failed");
      }
    } catch (err) {
      console.error(err);
      setHint("Something went wrong. Try again in a moment.");
      setHintTone("gold");
    } finally {
      setSubmitting(false);
    }
  }

  async function onShare() {
    const data = {
      title: "On Tour Live",
      text: "The booking app for artists & venues. Launching September 2026 — take your place.",
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
    <div className="fl-root">
      <style>{styles}</style>

      <div
        className="fl-bg"
        aria-hidden="true"
        style={{ backgroundImage: `url(${stageBg})` }}
      />
      <div className="fl-bg-wash" aria-hidden="true" />
      <div className="fl-aura" aria-hidden="true" />
      <div className="fl-grain" aria-hidden="true" />

      <header className="fl-bar">
        <svg className="fl-mini" viewBox="0 0 512 512" aria-hidden="true">
          <rect x="128" y="133" width="256" height="14" fill="#F5F0E4" />
          <rect x="171" y="133" width="14" height="246" fill="#F5F0E4" />
          <rect x="171" y="365" width="220" height="14" fill="#F5F0E4" />
          <circle cx="291" cy="258" r="57" fill="#C7A45E" />
        </svg>
        <span className="fl-eyebrow">Sydney · MMXXVI</span>
      </header>

      <main className="fl-main">
        <svg className="fl-mark" viewBox="0 0 512 512" role="img" aria-label="On Tour Live monogram">
          <defs>
            <radialGradient id="flGold" cx="0.38" cy="0.32" r="0.85">
              <stop offset="0" stopColor="#EBD3A0" />
              <stop offset="0.55" stopColor="#C7A45E" />
              <stop offset="1" stopColor="#99763D" />
            </radialGradient>
          </defs>
          <g className="fl-frame">
            <rect x="128" y="133" width="256" height="14" fill="#F5F0E4" />
            <rect x="171" y="133" width="14" height="246" fill="#F5F0E4" />
            <rect x="171" y="365" width="220" height="14" fill="#F5F0E4" />
          </g>
          <circle className="fl-theDisc" cx="291" cy="258" r="57" fill="url(#flGold)" />
        </svg>

        <h1 className="fl-wordmark">
          ON&nbsp;TOUR <span className="fl-disc" aria-hidden="true" /> LIVE
        </h1>
        <p className="fl-tag">The stage awaits.</p>
        <p className="fl-descriptor">The booking app for artists &amp; venues</p>

        <LaunchCountdown />


        {position === null ? (
          <form className="fl-form" onSubmit={onSubmit} noValidate>
            <div className="fl-seg" role="group" aria-label="I am an">
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
            <div className="fl-fields">
              {role === "artist" ? (
                <>
                  <input
                    className="fl-input"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    autoComplete="given-name"
                    required
                    aria-label="First name"
                  />
                  <input
                    className="fl-input"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    autoComplete="family-name"
                    required
                    aria-label="Last name"
                  />
                  <input
                    className="fl-input"
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
                    className="fl-input"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Full name"
                    autoComplete="name"
                    required
                    aria-label="Full name"
                  />
                  <input
                    className="fl-input"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    autoComplete="family-name"
                    required
                    aria-label="Last name"
                  />
                  <input
                    className="fl-input"
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
                className="fl-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                required
                aria-label="Email address"
              />
            </div>
            <button className="fl-cta" type="submit" disabled={submitting}>
              {submitting ? "Holding your place…" : "Take your place"}
            </button>
            <p className="fl-hint" data-tone={hintTone}>{hint}</p>
          </form>
        ) : (
          <div className="fl-held" aria-live="polite">
            <div className="fl-rule" />
            <h2>Your place is held</h2>
            <div className="fl-num">№ {position}</div>
            <p className="fl-sub">
              in line for launch.
              <br />
              Launching September 2026. Watch{" "}
              <a
                href="https://instagram.com/ontourlive"
                style={{ color: "var(--fl-champagne)", textDecoration: "none" }}
              >
                @ontourlive
              </a>
              .
            </p>
            <button className="fl-ghost" onClick={onShare}>
              Move up the line — share your invite
            </button>
            <p className="fl-hint">{shareHint}</p>
          </div>
        )}
      </main>

      <footer className="fl-footer">
        <span className="fl-eyebrow">
          <a href="https://instagram.com/ontourlive">@ontourlive</a>
        </span>
        <span className="fl-eyebrow">First Light — MMXXVI</span>
      </footer>
    </div>
  );
}

const styles = `
.fl-root{
  --fl-noir:#0F0D0A; --fl-noir-lift:#161310; --fl-ivory:#F5F0E4;
  --fl-champagne:#C7A45E; --fl-champagne-light:#EBD3A0; --fl-champagne-deep:#99763D;
  --fl-smoke:#8F887A;
  --fl-display:'Italiana',serif; --fl-accent:'Cormorant Garamond',serif; --fl-body:'Outfit',sans-serif;
  background:var(--fl-noir); color:var(--fl-ivory); font-family:var(--fl-body); font-weight:300;
  display:flex; flex-direction:column; min-height:100vh; overflow-x:hidden; position:relative; isolation:isolate;
}
.fl-root ::selection{background:var(--fl-champagne);color:var(--fl-noir)}
.fl-bg{
  position:absolute;inset:0;z-index:-4;background-size:cover;background-position:center;
  filter:grayscale(.55) contrast(1.12) brightness(.85);opacity:.32;pointer-events:none;
}
.fl-bg-wash{
  position:absolute;inset:0;z-index:-3;pointer-events:none;
  background:
    linear-gradient(to bottom, var(--fl-noir) 0%, transparent 28%, transparent 72%, var(--fl-noir) 100%),
    radial-gradient(ellipse 70% 55% at 50% 50%, transparent 0%, rgba(15,13,10,.55) 60%, var(--fl-noir) 100%);
}
.fl-aura{
  position:absolute;left:50%;top:50%;width:min(680px,92vw);height:min(680px,92vw);
  transform:translate(-50%,-50%);z-index:-2;pointer-events:none;
  background:radial-gradient(circle, rgba(199,164,94,.14) 0%, rgba(199,164,94,.06) 40%, transparent 70%);
  filter:blur(60px);
}
.fl-grain{
  position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.05;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='.9'/></svg>");
}
.fl-bar{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;padding:26px clamp(22px,5vw,54px)}
.fl-mini{width:30px;height:30px;flex:none}
.fl-eyebrow{font-size:10.5px;letter-spacing:.32em;color:var(--fl-smoke);text-transform:uppercase}
.fl-eyebrow a{color:var(--fl-smoke);text-decoration:none}
.fl-eyebrow a:hover{color:var(--fl-champagne)}
.fl-main{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;padding:24px clamp(22px,6vw,60px) 48px}
.fl-mark{width:clamp(108px,16vw,150px);margin-bottom:clamp(28px,4.5vh,44px)}
.fl-wordmark{
  font-family:var(--fl-display);font-size:clamp(34px,7.2vw,64px);letter-spacing:.14em;
  color:var(--fl-ivory);display:flex;align-items:center;justify-content:center;
  gap:clamp(10px,1.6vw,18px);white-space:nowrap;line-height:1;font-weight:400;
}
.fl-wordmark .fl-disc{
  width:clamp(9px,1.1vw,13px);height:clamp(9px,1.1vw,13px);border-radius:50%;flex:none;
  background:radial-gradient(circle at 38% 32%, var(--fl-champagne-light), var(--fl-champagne) 55%, var(--fl-champagne-deep));
  transform:translateY(12%);
}
.fl-tag{font-family:var(--fl-accent);font-style:italic;font-size:clamp(21px,3vw,29px);
  color:var(--fl-champagne);margin-top:clamp(18px,3vh,26px)}
.fl-descriptor{font-size:11.5px;letter-spacing:.3em;color:var(--fl-smoke);text-transform:uppercase;margin-top:14px}
.fl-form{margin-top:clamp(34px,5.5vh,52px);width:min(420px,100%)}
.fl-fields{display:flex;flex-direction:column;gap:14px}
.fl-seg{display:flex;border:1px solid rgba(199,164,94,.5);border-radius:6px;overflow:hidden;margin-bottom:18px}
.fl-seg button{
  flex:1;background:transparent;border:0;color:var(--fl-smoke);font-family:var(--fl-body);
  font-weight:400;font-size:12px;letter-spacing:.22em;text-transform:uppercase;
  padding:13px 0;cursor:pointer;transition:background .25s,color .25s;
}
.fl-seg button + button{border-left:1px solid rgba(199,164,94,.5)}
.fl-seg button[aria-pressed="true"]{background:var(--fl-champagne);color:var(--fl-noir);font-weight:600}
.fl-seg button:focus-visible, .fl-form input:focus-visible, .fl-cta:focus-visible, .fl-ghost:focus-visible{
  outline:2px solid var(--fl-champagne-light);outline-offset:2px}
.fl-form input.fl-input{
  width:100%;background:transparent;border:0;border-bottom:1px solid rgba(143,136,122,.45);
  color:var(--fl-ivory);font-family:var(--fl-body);font-weight:300;font-size:16px;
  padding:12px 2px;text-align:center;letter-spacing:.04em;border-radius:0;transition:border-color .25s;
}
.fl-form input.fl-input::placeholder{color:var(--fl-smoke)}
.fl-form input.fl-input:focus{border-bottom-color:var(--fl-champagne)}
.fl-cta{
  margin-top:24px;width:100%;background:var(--fl-champagne);color:var(--fl-noir);border:0;
  border-radius:6px;font-family:var(--fl-body);font-weight:600;font-size:13px;
  letter-spacing:.24em;text-transform:uppercase;padding:16px 0;cursor:pointer;
  transition:background .25s,transform .15s;
}
.fl-cta:hover{background:var(--fl-champagne-deep)}
.fl-cta:active{transform:translateY(1px)}
.fl-cta:disabled{opacity:.6;cursor:not-allowed}
.fl-hint{font-size:11px;color:var(--fl-smoke);letter-spacing:.06em;margin-top:14px;min-height:14px}
.fl-hint[data-tone="gold"]{color:var(--fl-champagne)}
.fl-held{margin-top:clamp(34px,5.5vh,52px)}
.fl-rule{width:56px;height:1px;background:var(--fl-champagne);opacity:.85;margin:0 auto 26px}
.fl-held h2{font-family:var(--fl-display);font-weight:400;font-size:clamp(24px,3.6vw,32px);
  letter-spacing:.12em;text-transform:uppercase}
.fl-num{font-family:var(--fl-display);font-size:clamp(58px,10vw,88px);color:var(--fl-champagne);
  line-height:1.05;margin:16px 0 8px}
.fl-sub{color:var(--fl-smoke);font-size:13.5px;letter-spacing:.05em;line-height:1.7}
.fl-ghost{
  display:inline-block;margin-top:26px;background:transparent;color:var(--fl-ivory);
  border:1px solid rgba(199,164,94,.6);border-radius:6px;font-family:var(--fl-body);
  font-weight:400;font-size:11.5px;letter-spacing:.22em;text-transform:uppercase;
  padding:13px 26px;cursor:pointer;transition:background .25s;
}
.fl-ghost:hover{background:rgba(199,164,94,.12)}
.fl-footer{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;
  padding:24px clamp(22px,5vw,54px);border-top:1px solid rgba(143,136,122,.18)}
@media (prefers-reduced-motion: no-preference){
  .fl-mark .fl-frame{opacity:0;animation:fl-rise .9s .55s ease-out forwards}
  .fl-mark .fl-theDisc{opacity:0;animation:fl-glow 1.3s .1s ease-out forwards}
  .fl-wordmark,.fl-tag,.fl-descriptor,.fl-form,.fl-held{
    opacity:0;transform:translateY(10px);animation:fl-rise .8s ease-out forwards
  }
  .fl-wordmark{animation-delay:1.05s}.fl-tag{animation-delay:1.25s}
  .fl-descriptor{animation-delay:1.4s}.fl-form,.fl-held{animation-delay:1.55s}
  @keyframes fl-rise{to{opacity:1;transform:translateY(0)}}
  @keyframes fl-glow{0%{opacity:0}60%{opacity:1}100%{opacity:1}}
}
@media (max-width:430px){ .fl-wordmark{letter-spacing:.11em} }

.fl-countdown{margin-top:clamp(26px,4vh,36px);display:flex;flex-direction:column;align-items:center;gap:10px}
.fl-cd-grid{display:flex;align-items:flex-start;justify-content:center;gap:clamp(10px,1.8vw,18px)}
.fl-cd-unit{display:flex;flex-direction:column;align-items:center;min-width:clamp(48px,7vw,64px)}
.fl-cd-num{font-family:var(--fl-display);font-weight:400;font-size:clamp(30px,4.6vw,42px);
  color:var(--fl-ivory);line-height:1;letter-spacing:.06em;font-variant-numeric:tabular-nums}
.fl-cd-label{margin-top:6px;font-size:9.5px;letter-spacing:.32em;color:var(--fl-smoke);text-transform:uppercase}
.fl-cd-sep{font-family:var(--fl-display);font-size:clamp(24px,3.6vw,34px);color:var(--fl-champagne);
  opacity:.7;line-height:1;transform:translateY(2px)}
.fl-cd-cap{font-family:var(--fl-accent);font-style:italic;font-size:14px;color:var(--fl-champagne);
  letter-spacing:.04em;margin-top:2px}
.fl-live{font-family:var(--fl-display);font-size:clamp(22px,3.4vw,30px);letter-spacing:.12em;
  color:var(--fl-champagne);text-transform:uppercase;margin:0}
@media (prefers-reduced-motion: no-preference){
  .fl-countdown{opacity:0;transform:translateY(10px);animation:fl-rise .8s 1.5s ease-out forwards}
}
`;
