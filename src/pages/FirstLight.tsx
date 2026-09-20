import { useState, useRef, FormEvent } from "react";
import { Instagram, Facebook, Music2 } from "lucide-react";
import { socialLinks } from "@/config/social";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PageSeo from "@/components/PageSeo";
import LaunchCountdown from "@/components/LaunchCountdown";
import appPreview from "@/assets/app-preview.jpg";

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
  const formRef = useRef<HTMLFormElement | null>(null);

  function joinAs(next: "artist" | "venue") {
    setRole(next);
    const form = formRef.current;
    if (form) {
      form.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => {
        form.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
      }, 450);
    }
  }




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


  const location = useLocation();
  const seoPath = location.pathname === "/waitlist" ? "/waitlist" : "/";

  return (
    <div className="cl-root">
      <PageSeo
        title="On Tour Live — Join the founding list"
        description="The booking app for artists and venues. Launching September 2026, Sydney first. Join the founding list and take your place."
        path={seoPath}
      />
      <style>{styles}</style>


      <a className="cl-skip" href="#cl-main">Skip to main content</a>

      <header className="cl-bar">
        <Crest className="cl-mini" />
        <span className="cl-eyebrow">Sydney · MMXXVI</span>
      </header>

      <main className="cl-main" id="cl-main" tabIndex={-1}>
        <Crest className="cl-mark" />

        <p className="cl-eyebrow cl-pine">On Tour Live</p>
        <h1 className="cl-wordmark">Join the founding list</h1>
        <p className="cl-aside">Members book first.</p>
        <p className="cl-descriptor">The booking app for artists &amp; venues</p>

        <LaunchCountdown />

        {position === null ? (
          <form className="cl-form" id="cl-signup" ref={formRef} onSubmit={onSubmit} noValidate>
            <div className="cl-seg" role="group" aria-label="Sign up as">
              <button
                type="button"
                aria-pressed={role === "artist"}
                aria-label="Sign up as an artist"
                onClick={() => setRole("artist")}
              >
                Artist
              </button>
              <button
                type="button"
                aria-pressed={role === "venue"}
                aria-label="Sign up as a venue"
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
            <p className="cl-hint" data-tone={hintTone} role="status" aria-live="polite">{hint}</p>
          </form>
        ) : (
          <div className="cl-held" role="status" aria-live="polite">
            <div className="cl-rule" />
            <h2>You&rsquo;re on the list</h2>
            <div className="cl-num">No. {position}</div>
            <p className="cl-sub">of the founding list.</p>
            <p className="cl-sub cl-sub-quiet">
              App launches September 2026 · Sydney first.
              <br />
              Watch{" "}
              <a href={socialLinks.instagram.url} target="_blank" rel="noopener noreferrer" className="cl-link">
                @ontourlive<span className="cl-sr"> (opens in a new tab)</span>
              </a>
              .
            </p>
            <button className="cl-ghost" onClick={onShare}>
              Move up the list — share your invite
            </button>
            <p className="cl-hint">{shareHint}</p>
          </div>
        )}

        <section className="cl-how" aria-labelledby="cl-how-title">
          <div className="cl-rule" />
          <p className="cl-eyebrow cl-pine">For artists</p>
          <h2 id="cl-how-title" className="cl-how-title">Find the rooms, keep the work coming</h2>
          <ol className="cl-how-list">
            <li className="cl-how-item">
              <span className="cl-how-num">I</span>
              <div>
                <h3>Discover opportunities</h3>
                <p>
                  See open slots and venue requests as they are posted, filtered by city,
                  date and the kind of night you play — no cold outreach, no missed calls.
                </p>
              </div>
            </li>
            <li className="cl-how-item">
              <span className="cl-how-num">II</span>
              <div>
                <h3>Manage your profile</h3>
                <p>
                  One living press kit: bio, photos, music, past rooms, live audience numbers
                  and your travel calendar — always current, always ready to send.
                </p>
              </div>
            </li>
            <li className="cl-how-item">
              <span className="cl-how-num">III</span>
              <div>
                <h3>Connect with venues</h3>
                <p>
                  Message directly, agree the fee, and lock the date in one thread —
                  offers, confirmations and payment all handled in the app.
                </p>
              </div>
            </li>
          </ol>
          <button type="button" className="cl-ghost cl-how-cta" onClick={() => joinAs("artist")}>
            Join as an artist
          </button>
        </section>


        <section className="cl-how" aria-labelledby="cl-how-venues-title">
          <div className="cl-rule" />
          <p className="cl-eyebrow cl-pine">For venues</p>
          <h2 id="cl-how-venues-title" className="cl-how-title">Fill every night with the right act</h2>
          <ol className="cl-how-list">
            <li className="cl-how-item">
              <span className="cl-how-num">I</span>
              <div>
                <h3>Find artists</h3>
                <p>
                  Search by genre, city, date and audience reach, and see who is genuinely
                  free that night before you reach out.
                </p>
              </div>
            </li>
            <li className="cl-how-item">
              <span className="cl-how-num">II</span>
              <div>
                <h3>Post what you need</h3>
                <p>
                  Put an open slot to the whole roster in one go — matching acts are notified
                  and reply with their fee, so you compare real offers, not guesses.
                </p>
              </div>
            </li>
            <li className="cl-how-item">
              <span className="cl-how-num">III</span>
              <div>
                <h3>Run your calendar</h3>
                <p>
                  Confirmations, contacts, fees and payment sit in one place, with reviews
                  from past nights to tell you who to book again.
                </p>
              </div>
            </li>
          </ol>
          <button type="button" className="cl-ghost cl-how-cta" onClick={() => joinAs("venue")}>
            Join as a venue
          </button>
        </section>

        <section className="cl-how" aria-labelledby="cl-steps-title">
          <div className="cl-rule" />
          <p className="cl-eyebrow cl-pine">How it works</p>
          <h2 id="cl-steps-title" className="cl-how-title">Three steps, either side of the stage</h2>
          <ol className="cl-how-list">
            <li className="cl-how-item">
              <span className="cl-how-num">I</span>
              <div>
                <h3>Set up your page</h3>
                <p>Artists build a press kit, venues describe their rooms and the nights they run. It takes minutes and stays current.</p>
              </div>
            </li>
            <li className="cl-how-item">
              <span className="cl-how-num">II</span>
              <div>
                <h3>Find the match</h3>
                <p>Search by city, date, genre and audience size, or post what you need and let the right side come to you.</p>
              </div>
            </li>
            <li className="cl-how-item">
              <span className="cl-how-num">III</span>
              <div>
                <h3>Agree it in one place</h3>
                <p>Message, settle the fee, confirm the date and handle payment in the app — then review each other afterwards.</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="cl-preview" aria-labelledby="cl-preview-title">
          <div className="cl-rule" />
          <p className="cl-eyebrow cl-pine">A first look</p>
          <h2 id="cl-preview-title" className="cl-how-title">What you&rsquo;ll be using</h2>
          <figure className="cl-preview-figure">
            <img
              src={appPreview}
              alt="Two phone screens from the On Tour Live app: a list of open slots at Australian venues, and an artist profile with genre tags and an availability calendar."
              width={1408}
              height={1024}
              loading="lazy"
            />
            <figcaption>
              Open slots across the country on one side, a living artist profile with real
              availability on the other. Design in progress — final app may differ.
            </figcaption>
          </figure>
        </section>

        <section className="cl-tools" aria-labelledby="cl-tools-title">
          <div className="cl-rule" />
          <p className="cl-eyebrow cl-pine">What&rsquo;s inside</p>
          <h2 id="cl-tools-title" className="cl-how-title">The tools, in short</h2>
          <ul className="cl-tools-grid">
            <li><h3>Profiles &amp; press kits</h3><p>Bio, photos, music and past rooms in one page you keep current.</p></li>
            <li><h3>Search &amp; filters</h3><p>Find acts or rooms by city, date, genre and audience size.</p></li>
            <li><h3>Availability calendar</h3><p>Mark the nights you are free or the nights you need filled.</p></li>
            <li><h3>Direct messaging</h3><p>Talk it through in one thread, with files and read receipts.</p></li>
            <li><h3>Offers &amp; agreements</h3><p>Put terms in writing and keep every change on the record.</p></li>
            <li><h3>Payments</h3><p>Secure transfers and receipts handled inside the app.</p></li>
            <li><h3>Audience insights</h3><p>Live follower and reach numbers pulled from social accounts.</p></li>
            <li><h3>Reviews &amp; history</h3><p>Ratings from past nights so both sides know who they are dealing with.</p></li>
          </ul>
          <p className="cl-tools-note">
            On Tour Live is software for artists and venues to run their own arrangements —
            we are not an agency and we do not book on anyone&rsquo;s behalf.
          </p>
        </section>

        <section className="cl-quotes" aria-labelledby="cl-quotes-title">
          <div className="cl-rule" />
          <p className="cl-eyebrow cl-pine">In their words</p>
          <h2 id="cl-quotes-title" className="cl-how-title">Artists &amp; venues on On Tour Live</h2>
          <ul className="cl-quotes-list">
            <li>
              <blockquote>
                <p>Every open slot in the city in one place — I stopped chasing bookers and started
                filling my calendar a month ahead.</p>
                <footer>Artist &middot; Sydney NSW</footer>
              </blockquote>
            </li>
            <li>
              <blockquote>
                <p>I post the night, the right acts reply with their fee, and the whole thing is
                agreed before close. No more ringing round on a Thursday.</p>
                <footer>Venue &middot; Newcastle NSW</footer>
              </blockquote>
            </li>
            <li>
              <blockquote>
                <p>My profile does the introductions now. Rooms can see my past gigs, my audience
                numbers and the nights I&rsquo;m free.</p>
                <footer>Artist &middot; Melbourne VIC</footer>
              </blockquote>
            </li>
          </ul>
          <p className="cl-quotes-note">
            Placeholder wording while we&rsquo;re in build — these will be replaced with real quotes
            from our founding artists and venues at launch.
          </p>
        </section>




        <section className="cl-contact" aria-label="Follow On Tour Live">
          <div className="cl-rule" />

          <div className="cl-rule" />
          <p className="cl-contact-lead">Follow along</p>
          <div className="cl-social">
            <a
              className="cl-social-link"
              href={socialLinks.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${socialLinks.instagram.label} — opens in a new tab`}
            >
              <Instagram aria-hidden="true" />
              <span>Instagram</span>
            </a>
            <a
              className="cl-social-link"
              href={socialLinks.facebook.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${socialLinks.facebook.label} — opens in a new tab`}
            >
              <Facebook aria-hidden="true" />
              <span>Facebook</span>
            </a>
            <a
              className="cl-social-link"
              href={socialLinks.tiktok.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${socialLinks.tiktok.label} — opens in a new tab`}
            >
              <Music2 aria-hidden="true" />
              <span>TikTok</span>
            </a>
          </div>
          <p className="cl-contact-note">
            Questions?{" "}
            <a href="mailto:hello@ontour.live" className="cl-link">
              hello@ontour.live
            </a>
          </p>
        </section>

      </main>

      <footer className="cl-footer">
        <span className="cl-eyebrow">
          <a href={socialLinks.instagram.url} target="_blank" rel="noopener noreferrer" className="cl-footer-link">@ontour.live<span className="cl-sr"> on Instagram (opens in a new tab)</span></a>
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
  --ink:#171512; --ox:#572B2B; --sand:#8E8570; --sand-ink:#5C5445;
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
  letter-spacing:.28em;text-transform:uppercase;color:var(--sand-ink);
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
  letter-spacing:.28em;text-transform:uppercase;color:var(--sand-ink);
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
.cl-ghost:focus-visible,
.cl-link:focus-visible,
.cl-footer-link:focus-visible,
.cl-skip:focus-visible,
a:focus-visible,
button:focus-visible{outline:3px solid var(--pine);outline-offset:3px;border-radius:4px}

.cl-sr{
  position:absolute;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;
}
.cl-skip{
  position:absolute;left:50%;top:-60px;transform:translateX(-50%);
  z-index:20;background:var(--pine);color:var(--bone);
  font-family:var(--font-body);font-weight:700;font-size:11px;
  letter-spacing:.24em;text-transform:uppercase;text-decoration:none;
  padding:12px 20px;border-radius:0 0 999px 999px;transition:top .15s;
}
.cl-skip:focus{top:0}

.cl-form input.cl-input{
  width:100%;background:var(--bone-lift);
  border:1px solid hsl(0 0% 9% / .14);border-radius:999px;
  color:var(--ink);font-family:var(--font-body);font-weight:500;font-size:15px;
  padding:14px 20px;text-align:center;letter-spacing:.02em;
  transition:border-color .2s;
}
.cl-form input.cl-input::placeholder{color:var(--sand-ink)}
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
  font-family:var(--font-body);font-size:11.5px;color:var(--sand-ink);
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
  color:var(--sand-ink);font-size:13.5px;letter-spacing:.04em;line-height:1.7;
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
.cl-how-cta{align-self:center;margin-top:22px}


.cl-how{
  margin-top:clamp(44px,7vh,72px);width:min(560px,100%);
  display:flex;flex-direction:column;align-items:center;text-align:left;
}
.cl-how .cl-rule{margin-bottom:20px}
.cl-how + .cl-how{margin-top:clamp(30px,4.5vh,48px)}
.cl-how .cl-eyebrow{text-align:center}
.cl-how-title{
  font-family:var(--font-display);font-weight:400;
  font-size:clamp(24px,3.4vw,34px);line-height:1.15;letter-spacing:.02em;
  color:var(--ink);text-align:center;margin:12px 0 0;max-width:20ch;
}
.cl-how-list{list-style:none;margin:26px 0 0;padding:0;width:100%;display:flex;flex-direction:column}
.cl-how-item{
  display:flex;gap:16px;align-items:flex-start;
  padding:18px 0;border-top:1px solid hsl(0 0% 9% / .14);
}
.cl-how-item:last-child{border-bottom:1px solid hsl(0 0% 9% / .14)}
.cl-how-num{
  font-family:var(--font-display);font-size:15px;color:var(--pine);
  line-height:1;padding-top:3px;min-width:26px;letter-spacing:.06em;
}
.cl-how-item h3{
  font-family:var(--font-body);font-weight:700;font-size:11px;
  letter-spacing:.28em;text-transform:uppercase;color:var(--pine);margin:0;
}
.cl-how-item p{
  font-family:var(--font-body);font-weight:500;font-size:14px;line-height:1.75;
  color:var(--ink);opacity:.82;margin:8px 0 0;
}

.cl-preview{
  margin-top:clamp(40px,6vh,64px);width:min(620px,100%);
  display:flex;flex-direction:column;align-items:center;text-align:center;
}
.cl-preview .cl-rule{margin-bottom:20px}
.cl-preview-figure{margin:24px 0 0;width:100%}
.cl-preview-figure img{
  display:block;width:100%;height:auto;
  border:1px solid hsl(0 0% 9% / .14);border-radius:14px;background:var(--bone-lift);
}
.cl-preview-figure figcaption{
  font-family:var(--font-body);font-weight:500;font-size:12.5px;line-height:1.7;
  color:var(--ink);opacity:.68;margin-top:12px;
}

.cl-tools{
  margin-top:clamp(40px,6vh,64px);width:min(560px,100%);
  display:flex;flex-direction:column;align-items:center;text-align:left;
}
.cl-tools .cl-rule{margin-bottom:20px}
.cl-tools .cl-eyebrow{text-align:center}
.cl-tools-grid{
  list-style:none;margin:24px 0 0;padding:0;width:100%;
  display:grid;grid-template-columns:repeat(2,1fr);
  gap:18px 24px;
}
.cl-tools-grid li{border-top:1px solid hsl(0 0% 9% / .14);padding-top:12px}
.cl-tools-grid h3{
  font-family:var(--font-body);font-weight:700;font-size:10px;
  letter-spacing:.26em;text-transform:uppercase;color:var(--pine);margin:0;
}
.cl-tools-grid p{
  font-family:var(--font-body);font-weight:500;font-size:13px;line-height:1.7;
  color:var(--ink);opacity:.8;margin:6px 0 0;
}
.cl-tools-note{
  font-family:var(--font-accent);font-style:italic;
  font-size:clamp(14px,1.8vw,16px);line-height:1.6;text-align:center;
  color:var(--ink);opacity:.72;margin:22px 0 0;max-width:44ch;
}

.cl-quotes{
  margin-top:clamp(40px,6vh,64px);width:min(560px,100%);
  display:flex;flex-direction:column;align-items:center;text-align:left;
}
.cl-quotes .cl-rule{margin-bottom:20px}
.cl-quotes .cl-eyebrow{text-align:center}
.cl-quotes-list{list-style:none;margin:24px 0 0;padding:0;width:100%;display:grid;gap:18px}
.cl-quotes-list li{border-top:1px solid hsl(0 0% 9% / .14);padding-top:14px}
.cl-quotes-list blockquote{margin:0}
.cl-quotes-list blockquote p{
  font-family:var(--font-accent);font-style:italic;
  font-size:clamp(15px,2vw,17px);line-height:1.6;color:var(--ink);margin:0;
}
.cl-quotes-list blockquote footer{
  font-family:var(--font-body);font-weight:700;font-size:10px;
  letter-spacing:.26em;text-transform:uppercase;color:var(--pine);margin-top:10px;
}
.cl-quotes-note{
  font-family:var(--font-body);font-weight:500;font-size:12px;line-height:1.7;
  text-align:center;color:var(--sand-ink);margin:20px 0 0;max-width:46ch;
}



.cl-contact{
  margin-top:clamp(40px,6vh,64px);display:flex;flex-direction:column;align-items:center;
  max-width:460px;
}
.cl-contact .cl-rule{margin-bottom:20px}
.cl-contact-lead{
  font-family:var(--font-accent);font-style:italic;font-size:clamp(18px,2.2vw,22px);
  color:var(--ox);margin:0;
}
.cl-contact-cta{margin-top:18px;text-decoration:none}
.cl-social{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:20px}
.cl-social-link{
  display:inline-flex;align-items:center;gap:8px;text-decoration:none;
  border:1.5px solid var(--pine);border-radius:999px;color:var(--pine);
  background:transparent;padding:11px 20px;
  font-family:var(--font-body);font-weight:700;font-size:11px;
  letter-spacing:.28em;text-transform:uppercase;
  transition:background .2s,color .2s;
}
.cl-social-link svg{width:15px;height:15px;flex:none}
.cl-social-link:hover{background:var(--pine);color:var(--bone)}
.cl-social-link:focus-visible{outline:2px solid var(--pine);outline-offset:3px}
.cl-contact-note{
  font-family:var(--font-body);font-size:12px;letter-spacing:.04em;
  color:var(--sand-ink);margin-top:14px;
}

.cl-footer{
  display:flex;justify-content:space-between;align-items:center;
  padding:24px clamp(22px,5vw,54px);
  border-top:1px solid hsl(0 0% 9% / .14);
}
.cl-footer-link{color:var(--sand-ink);text-decoration:none}
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
  letter-spacing:.28em;color:var(--sand-ink);text-transform:uppercase;
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

/* ---- Small screens: tighter rhythm, bigger tap targets ---- */
@media (max-width:520px){
  .cl-bar{padding:18px 20px}
  .cl-main{padding:28px 20px 40px;justify-content:flex-start}
  .cl-mark{margin-bottom:18px}
  .cl-wordmark{font-size:clamp(34px,10vw,44px);max-width:12ch}
  .cl-aside{margin-top:10px}
  .cl-descriptor{margin-top:14px;letter-spacing:.2em;line-height:1.7}
  .cl-form{margin-top:26px}
  .cl-seg{margin-bottom:14px}
  .cl-seg button{padding:15px 0;letter-spacing:.2em}
  .cl-form input.cl-input{padding:15px 18px;font-size:16px}
  .cl-cta{padding:18px 0;letter-spacing:.2em}
  .cl-held{margin-top:26px}
  .cl-how{margin-top:34px}
  .cl-how-title{font-size:23px;max-width:none}
  .cl-how-list{margin-top:20px}
  .cl-how-item{gap:12px;padding:16px 0}
  .cl-how-num{min-width:20px;font-size:14px}
  .cl-how-item h3{letter-spacing:.2em}
  .cl-tools{margin-top:34px}
  .cl-tools-grid{grid-template-columns:1fr;gap:0}
  .cl-tools-grid li{padding:14px 0}
  .cl-contact{margin-top:34px;width:100%}

  .cl-social{margin-top:16px;gap:8px;width:100%;flex-wrap:nowrap}
  .cl-social-link{
    flex:1;justify-content:center;padding:13px 6px;
    letter-spacing:.1em;font-size:10px;gap:6px;
  }
  .cl-social-link svg{width:14px;height:14px}
  .cl-contact-note{margin-top:16px;line-height:1.7}
  .cl-footer{
    flex-direction:column;gap:8px;text-align:center;padding:20px;
  }
  .cl-footer .cl-eyebrow{letter-spacing:.2em;line-height:1.6}
  .fl-cd-unit{min-width:54px}
}

@media (prefers-reduced-motion: no-preference){
  .cl-mark,.cl-wordmark,.cl-aside,.cl-descriptor,.cl-form,.cl-held,.fl-countdown,.cl-how,.cl-preview,.cl-tools,.cl-contact{
    opacity:0;transform:translateY(8px);animation:cl-rise .7s ease-out forwards
  }
  .cl-mark{animation-delay:.05s}
  .cl-wordmark{animation-delay:.25s}
  .cl-aside{animation-delay:.45s}
  .cl-descriptor{animation-delay:.6s}
  .fl-countdown{animation-delay:.75s}
  .cl-form,.cl-held{animation-delay:.9s}
  .cl-how{animation-delay:1.05s}
  .cl-preview{animation-delay:1.12s}
  .cl-tools{animation-delay:1.2s}
  .cl-contact{animation-delay:1.25s}
  @keyframes cl-rise{to{opacity:1;transform:translateY(0)}}
}
`;

