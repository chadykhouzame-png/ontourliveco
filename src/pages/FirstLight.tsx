import { useState, useRef, useEffect, FormEvent } from "react";
import { Instagram, Facebook, Music2 } from "lucide-react";
import { socialLinks } from "@/config/social";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PageSeo from "@/components/PageSeo";
import LaunchCountdown from "@/components/LaunchCountdown";
import appPreview from "@/assets/app-preview.jpg";
import { trackEvent } from "@/lib/analytics";

/**
 * On Tour Live — Founding List holding page.
 * Heritage members' club aesthetic: bone field, pine action, ink text,
 * oxblood italic accents. Typography: Young Serif / Archivo / Instrument Serif.
 */
type FieldName = "firstName" | "lastName" | "artistName" | "venueName" | "email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export default function FirstLight() {
  const [role, setRole] = useState<"artist" | "venue">("artist");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [hint, setHint] = useState("App launches September 2026 · Sydney first");
  const [hintTone, setHintTone] = useState<"muted" | "ox">("muted");
  const [position, setPosition] = useState<number | null>(null);
  const [shareHint, setShareHint] = useState("");
  const [confirmed, setConfirmed] = useState<{ email: string; role: "artist" | "venue"; name: string } | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const heldRef = useRef<HTMLDivElement | null>(null);
  const honeypotRef = useRef<HTMLInputElement | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  const viewTrackedRef = useRef(false);

  useEffect(() => {
    const form = formRef.current;
    if (!form || viewTrackedRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !viewTrackedRef.current) {
          viewTrackedRef.current = true;
          trackEvent("waitlist_form_view", { role });
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(form);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (position === null) return;
    const el = heldRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
  }, [position]);


  const values: Record<FieldName, string> = { firstName, lastName, artistName, venueName, email };
  const setters: Record<FieldName, (v: string) => void> = {
    firstName: setFirstName,
    lastName: setLastName,
    artistName: setArtistName,
    venueName: setVenueName,
    email: setEmail,
  };

  const labels: Record<FieldName, string> = {
    firstName: role === "artist" ? "First name" : "Full name",
    lastName: "Last name",
    artistName: "Artist name",
    venueName: "Venue name",
    email: "Email address",
  };

  const activeFields: FieldName[] =
    role === "artist"
      ? ["firstName", "lastName", "artistName", "email"]
      : ["firstName", "lastName", "venueName", "email"];

  function validate(name: FieldName, raw: string): string {
    const v = raw.trim();
    if (name === "email") {
      if (!v) return "Enter your email so we can let you know when we launch.";
      if (v.length > 255) return "That email is too long.";
      if (!EMAIL_RE.test(v)) return "That email doesn't look right — check for a typo, e.g. you@venue.com.";
      return "";
    }
    if (!v) return `${labels[name]} is required.`;
    if (v.length < 2) return `${labels[name]} looks too short.`;
    if (v.length > 100) return `${labels[name]} must be under 100 characters.`;
    return "";
  }

  function onFieldChange(name: FieldName, raw: string) {
    setters[name](raw);
    if (errors[name]) {
      const next = validate(name, raw);
      setErrors((prev) => ({ ...prev, [name]: next || undefined }));
    }
  }

  function onFieldBlur(name: FieldName) {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const message = validate(name, values[name]);
    setErrors((prev) => ({ ...prev, [name]: message || undefined }));
  }

  function chooseRole(next: "artist" | "venue") {
    setRole(next);
    setErrors({});
    setTouched({});
    setHint("App launches September 2026 · Sydney first");
    setHintTone("muted");
  }

  function joinAs(next: "artist" | "venue") {
    chooseRole(next);

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

    const nextErrors: Partial<Record<FieldName, string>> = {};
    activeFields.forEach((name) => {
      const message = validate(name, values[name]);
      if (message) nextErrors[name] = message;
    });
    setErrors(nextErrors);
    setTouched((prev) => {
      const next = { ...prev };
      activeFields.forEach((name) => (next[name] = true));
      return next;
    });

    const firstInvalid = activeFields.find((name) => nextErrors[name]);
    if (firstInvalid) {
      setHint(
        Object.keys(nextErrors).length > 1
          ? "Please fix the highlighted fields."
          : "Please fix the highlighted field.",
      );
      setHintTone("ox");
      formRef.current?.querySelector<HTMLInputElement>(`#cl-f-${firstInvalid}`)?.focus();
      return;
    }

    const value = email.trim();
    const first = firstName.trim();
    const last = lastName.trim();
    const artist = artistName.trim();
    const venue = venueName.trim();

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
          company: honeypotRef.current?.value ?? "",
          elapsedMs: Date.now() - startedAtRef.current,
        },
      });
      if (error) throw error;
      if (data?.position) {
        setPosition(data.position as number);
        setConfirmed({ email: value, role, name: role === "artist" ? artist : venue });
      } else if (data?.error === "rate_limited") {
        setHint("Too many attempts — try again in an hour.");
        setHintTone("ox");
      } else if (data?.error === "duplicate" || data?.error === "already_registered") {
        setErrors((prev) => ({ ...prev, email: "This email is already on the list — you're all set." }));
        setHint("You're already on the list with that email.");
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
                onClick={() => chooseRole("artist")}
              >
                Artist
              </button>
              <button
                type="button"
                aria-pressed={role === "venue"}
                aria-label="Sign up as a venue"
                onClick={() => chooseRole("venue")}
              >
                Venue
              </button>
            </div>
            <div className="cl-hp" aria-hidden="true">
              <label htmlFor="cl-f-company">Company (leave blank)</label>
              <input
                id="cl-f-company"
                name="company"
                type="text"
                ref={honeypotRef}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <div className="cl-fields">
              {activeFields.map((name) => {
                const invalid = Boolean(errors[name]);
                return (
                  <div className="cl-field" key={name}>
                    <label className="cl-label" htmlFor={`cl-f-${name}`}>
                      {labels[name]}
                    </label>
                    <input
                      id={`cl-f-${name}`}
                      className="cl-input"
                      type={name === "email" ? "email" : "text"}
                      value={values[name]}
                      onChange={(e) => onFieldChange(name, e.target.value)}
                      onBlur={() => onFieldBlur(name)}
                      placeholder={name === "email" ? "your@email.com" : labels[name]}
                      autoComplete={
                        name === "email"
                          ? "email"
                          : name === "lastName"
                            ? "family-name"
                            : name === "artistName"
                              ? "nickname"
                              : name === "venueName"
                                ? "organization"
                                : role === "artist"
                                  ? "given-name"
                                  : "name"
                      }
                      maxLength={name === "email" ? 255 : 100}
                      required
                      aria-invalid={invalid}
                      aria-describedby={invalid ? `cl-e-${name}` : undefined}
                      data-invalid={invalid ? "true" : undefined}
                    />
                    {invalid && (
                      <p className="cl-error" id={`cl-e-${name}`} role="alert">
                        <span aria-hidden="true" className="cl-error-mark">!</span>
                        <span>{errors[name]}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button className="cl-cta" type="submit" disabled={submitting}>
              {submitting ? "Holding your place…" : "Take your place"}
            </button>
            <p className="cl-hint" data-tone={hintTone} role="status" aria-live="polite">{hint}</p>
            <p className="cl-privacy">
              We&rsquo;ll only email you about the launch and your place on the list. No spam, no sharing
              or selling your details, and you can ask us to remove you any time. See our{" "}
              <a className="cl-link" href="/privacy">privacy policy</a>.
            </p>

          </form>
        ) : (
          <div className="cl-held" ref={heldRef} tabIndex={-1} role="status" aria-live="polite">
            <div className="cl-rule" />
            <h2>You&rsquo;re on the list</h2>
            <div className="cl-num">No. {position}</div>
            <p className="cl-sub">of the founding list.</p>
            <p className="cl-confirm">
              Thanks{confirmed?.name ? `, ${confirmed.name}` : ""} — your spot as
              {confirmed?.role === "venue" ? " a venue" : " an artist"} is saved. We&rsquo;ll email{" "}
              <strong>{confirmed?.email}</strong> when On Tour Live opens. Nothing else to do for now.
            </p>
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
                <p>Open slots in your city, filtered by date and the nights you play.</p>
              </div>
            </li>
            <li className="cl-how-item">
              <span className="cl-how-num">II</span>
              <div>
                <h3>Manage your profile</h3>
                <p>One living press kit — music, photos, past rooms and free dates.</p>
              </div>
            </li>
            <li className="cl-how-item">
              <span className="cl-how-num">III</span>
              <div>
                <h3>Connect with venues</h3>
                <p>Message, agree the fee and lock the date in one thread.</p>
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
                <p>Search by genre, reach and date — and see who is actually free.</p>
              </div>
            </li>
            <li className="cl-how-item">
              <span className="cl-how-num">II</span>
              <div>
                <h3>Post what you need</h3>
                <p>One post reaches every matching act. They reply with their fee.</p>
              </div>
            </li>
            <li className="cl-how-item">
              <span className="cl-how-num">III</span>
              <div>
                <h3>Run your calendar</h3>
                <p>Confirmations, fees, payment and past reviews in one place.</p>
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

        <section className="cl-tail cl-midcta" aria-labelledby="cl-midcta-title">
          <h2 className="cl-tail-title" id="cl-midcta-title">Be there on day one</h2>
          <p className="cl-tail-lead">
            Join the founding list and we&rsquo;ll let you know the moment On Tour Live opens in your city.
          </p>
          <div className="cl-tail-actions">
            <button type="button" className="cl-ghost" onClick={() => joinAs("artist")}>
              Join as an artist
            </button>
            <button type="button" className="cl-ghost" onClick={() => joinAs("venue")}>
              Join as a venue
            </button>
          </div>
        </section>



        <section className="cl-preview" aria-labelledby="cl-preview-title">
          <div className="cl-rule" />
          <p className="cl-eyebrow cl-pine">A first look</p>
          <h2 id="cl-preview-title" className="cl-how-title">What you&rsquo;ll be using</h2>
          <figure className="cl-preview-figure">
            <div className="cl-preview-scroll" tabIndex={0} role="group" aria-label="App preview, scrollable on small screens">
              <img
                src={appPreview}
                alt="Two phone screens from the On Tour Live app: a list of open slots at Australian venues, and an artist profile with genre tags and an availability calendar."
                width={1408}
                height={1024}
                loading="lazy"
              />
            </div>
            <p className="cl-preview-hint" aria-hidden="true">Swipe to see both screens</p>
            <ul className="cl-preview-notes">
              <li>
                <span className="cl-preview-note-label">Left — for artists</span>
                <span className="cl-preview-note-text">Open slots near you, with date, venue and fee up front.</span>
              </li>
              <li>
                <span className="cl-preview-note-label">Right — for venues</span>
                <span className="cl-preview-note-text">A full artist profile: genre, past nights and real availability.</span>
              </li>
            </ul>
            <figcaption>
              Design in progress — final app may differ.
            </figcaption>
          </figure>


        </section>

        <section className="cl-tail cl-midcta" aria-labelledby="cl-previewcta-title">
          <h2 className="cl-tail-title" id="cl-previewcta-title">Want first access?</h2>
          <p className="cl-tail-lead">
            Join the launch waitlist and we&rsquo;ll send you an invite as soon as it&rsquo;s ready.
          </p>
          <div className="cl-tail-actions">
            <button type="button" className="cl-ghost" onClick={() => joinAs("artist")}>
              Join as an artist
            </button>
            <button type="button" className="cl-ghost" onClick={() => joinAs("venue")}>
              Join as a venue
            </button>
          </div>
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

        <section className="cl-benefits" aria-labelledby="cl-benefits-title">
          <div className="cl-rule" />
          <p className="cl-eyebrow cl-pine">Why artists use it</p>
          <h2 id="cl-benefits-title" className="cl-how-title">More nights booked, less chasing</h2>
          <ul className="cl-benefits-list">
            <li><h3>See the work first</h3><p>Open slots land in your feed the day a venue posts them.</p></li>
            <li><h3>Pitch in one tap</h3><p>Your profile, music and past rooms go with every reply.</p></li>
            <li><h3>Never double-book</h3><p>Your calendar shows venues only the nights you are free.</p></li>
            <li><h3>Agree the fee in writing</h3><p>Offers, counter-offers and the final terms stay on the record.</p></li>
            <li><h3>Get paid on time</h3><p>Payment is handled in the app with a receipt for every gig.</p></li>
            <li><h3>Build a track record</h3><p>Reviews and past nights make the next booking an easier yes.</p></li>
          </ul>
        </section>

        <section className="cl-benefits" aria-labelledby="cl-benefits-venues-title">
          <div className="cl-rule" />
          <p className="cl-eyebrow cl-pine">Why venues use it</p>
          <h2 id="cl-benefits-venues-title" className="cl-how-title">Fill the room, without the ring-around</h2>
          <ul className="cl-benefits-list">
            <li><h3>Post a night in minutes</h3><p>Set the date, the fee and the sound you want, then let acts come to you.</p></li>
            <li><h3>See who is actually free</h3><p>Artist calendars show real availability for the night you need.</p></li>
            <li><h3>Judge before you book</h3><p>Music, photos, past rooms and audience numbers on every profile.</p></li>
            <li><h3>One thread per booking</h3><p>Messages, offers and final terms all kept in the same place.</p></li>
            <li><h3>Clean payment records</h3><p>Fees paid through the app with receipts for your books.</p></li>
            <li><h3>Build your regulars</h3><p>Reviews and past nights make rebooking the right acts simple.</p></li>
          </ul>
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

        <section className="cl-faq" aria-labelledby="cl-faq-title">
          <div className="cl-rule" />
          <p className="cl-eyebrow cl-pine">Questions, answered</p>
          <h2 id="cl-faq-title" className="cl-how-title">Common questions</h2>
          <div className="cl-faq-list">
            <details>
              <summary>How do venues discover artists?</summary>
              <p>
                Search the roster by city, date, genre and audience reach, and see who is genuinely
                free that night before you get in touch. Every artist keeps a profile with past
                rooms, music, photos and live follower numbers, so you can judge the fit first.
              </p>
            </details>
            <details>
              <summary>How do artists find work?</summary>
              <p>
                Open slots and venue requests appear in one feed, filtered by city, date and the
                kind of night it is. You reply with your fee — no cold outreach, no missed calls.
              </p>
            </details>
            <details>
              <summary>How does posting a venue slot work?</summary>
              <p>
                Put the night, the slot and what you need to the whole roster in one go. Matching
                artists are notified and respond with their fee, so you compare real offers side by
                side instead of guessing.
              </p>
            </details>
            <details>
              <summary>How are payments handled?</summary>
              <p>
                Fees are agreed in the app and paid through it, with secure transfers and receipts
                on both sides. On Tour Live charges a small platform fee on completed payments — we
                are software for artists and venues, not an agency, and we never book on your behalf.
              </p>
            </details>
            <details>
              <summary>How do reviews work?</summary>
              <p>
                After a night is marked complete, the artist and the venue can each leave a one to
                five star review. Ratings build up over time so both sides know who they are
                dealing with before agreeing anything.
              </p>
            </details>
            <details>
              <summary>What does it cost to join?</summary>
              <p>
                Creating a profile and using the app is free while we launch. Join the founding list
                above and we will email you the moment it opens in your city.
              </p>
            </details>
            <details>
              <summary>Who can join?</summary>
              <p>
                Artists of any size — DJs, bands, solo singers — and any venue that puts on live
                music, from small bars to clubs. We start in Sydney and open other cities from there.
              </p>
            </details>
            <details>
              <summary>What happens after I join the list?</summary>
              <p>
                You get one email confirming your place, then a note when the app opens in your city.
                No spam, and you can ask us to remove you at any time.
              </p>
            </details>
            <details>
              <summary>Do I have to accept every offer?</summary>
              <p>
                No. Every slot and every offer is yours to accept, counter or ignore. Nothing is
                agreed until both sides confirm it in the app.
              </p>
            </details>
            <details>
              <summary>Is my information private?</summary>
              <p>
                Only what you put on your public profile is visible. Your email, messages and payment
                details stay private, and we never sell your details.
              </p>
            </details>
          </div>

        </section>

        <section className="cl-tail" aria-labelledby="cl-tail-title">
          <div className="cl-rule" />
          <h2 className="cl-tail-title" id="cl-tail-title">Ready to join?</h2>
          <p className="cl-tail-lead">
            Leave your email and we'll tell you the moment On Tour Live opens in your city.
          </p>
          <div className="cl-tail-actions">
            <button type="button" className="cl-ghost" onClick={() => joinAs("artist")}>
              Join as an artist
            </button>
            <button type="button" className="cl-ghost" onClick={() => joinAs("venue")}>
              Join as a venue
            </button>
          </div>
        </section>


        <section className="cl-contact" aria-label="Follow On Tour Live">
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
.cl-field{display:flex;flex-direction:column;gap:6px}
.cl-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.cl-label{
  font-family:var(--font-body);font-weight:600;font-size:10px;
  letter-spacing:.24em;text-transform:uppercase;color:var(--sand-ink);
  text-align:center;
}
.cl-form input.cl-input[data-invalid="true"]{border-color:var(--ox);background:hsl(0 40% 97%);border-width:2px}
.cl-form input.cl-input[data-invalid="true"]:focus{border-color:var(--ox)}
.cl-error{
  margin:0;color:var(--ox);font-family:var(--font-accent);font-style:italic;
  font-size:13.5px;line-height:1.35;text-align:center;
  display:flex;align-items:center;justify-content:center;gap:6px;
}
.cl-error-mark{
  flex:none;width:16px;height:16px;border-radius:999px;
  border:1px solid var(--ox);font-family:var(--font-body);font-style:normal;
  font-size:11px;font-weight:700;line-height:14px;text-align:center;
}


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
.cl-privacy{
  margin:10px auto 0;max-width:380px;font-family:var(--font-body);font-size:11.5px;
  line-height:1.6;color:var(--sand-ink);letter-spacing:.02em;
}
.cl-privacy .cl-link{color:var(--sand-ink);text-decoration:underline;text-underline-offset:3px}
.cl-privacy .cl-link:hover{color:var(--pine)}


.cl-held{margin-top:clamp(34px,5vh,48px);max-width:460px}
.cl-confirm{
  font-family:var(--font-body);font-weight:500;font-size:13px;line-height:1.7;
  color:var(--pine-deep);margin:14px auto 0;max-width:42ch;
  border:1px solid hsl(0 0% 9% / .14);border-radius:12px;padding:14px 16px;
}
.cl-confirm strong{font-weight:700;word-break:break-word}
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
.cl-preview-scroll{width:100%;border-radius:14px}
.cl-preview-scroll:focus-visible{outline:3px solid var(--pine);outline-offset:3px}
.cl-preview-figure img{
  display:block;width:100%;height:auto;
  border:1px solid hsl(0 0% 9% / .14);border-radius:14px;background:var(--bone-lift);
}
.cl-preview-hint{display:none}
.cl-preview-notes{
  list-style:none;margin:16px 0 0;padding:0;width:100%;
  display:grid;grid-template-columns:repeat(2,1fr);gap:14px 24px;text-align:left;
}
.cl-preview-notes li{
  display:flex;flex-direction:column;gap:6px;
  border-top:1px solid hsl(0 0% 9% / .14);padding-top:10px;
}
.cl-preview-note-label{
  font-family:var(--font-body);font-weight:600;font-size:10.5px;
  letter-spacing:.2em;text-transform:uppercase;color:var(--pine);
}
.cl-preview-note-text{
  font-family:var(--font-body);font-weight:500;font-size:13px;line-height:1.7;
  color:var(--ink);opacity:.82;
}
.cl-preview-figure figcaption{
  font-family:var(--font-body);font-weight:500;font-size:12.5px;line-height:1.7;
  color:var(--sand-ink);margin-top:14px;
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

.cl-benefits{
  margin-top:clamp(40px,6vh,64px);width:min(680px,100%);
  display:flex;flex-direction:column;align-items:center;text-align:center;
}
.cl-benefits .cl-rule{margin-bottom:20px}
.cl-benefits-list{
  list-style:none;margin:24px 0 0;padding:0;width:100%;
  display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:18px 24px;text-align:left;
}
.cl-benefits-list h3{
  font-family:var(--font-body);font-weight:700;font-size:11px;letter-spacing:.22em;
  text-transform:uppercase;color:var(--pine-deep);margin:0 0 6px;
}
.cl-benefits-list p{
  font-family:var(--font-body);font-weight:500;font-size:13px;line-height:1.7;
  color:var(--sand-ink);margin:0;
}

.cl-faq{
  margin-top:clamp(40px,6vh,64px);width:min(560px,100%);
  display:flex;flex-direction:column;align-items:center;text-align:left;
}
.cl-faq .cl-rule{margin-bottom:20px}
.cl-faq .cl-eyebrow{text-align:center}
.cl-faq-list{width:100%;margin-top:24px}
.cl-faq-list details{border-top:1px solid hsl(0 0% 9% / .14)}
.cl-faq-list details:last-child{border-bottom:1px solid hsl(0 0% 9% / .14)}
.cl-faq-list summary{
  list-style:none;cursor:pointer;padding:14px 28px 14px 0;position:relative;
  font-family:var(--font-body);font-weight:700;font-size:11px;
  letter-spacing:.18em;text-transform:uppercase;color:var(--pine);
}
.cl-faq-list summary::-webkit-details-marker{display:none}
.cl-faq-list summary::after{
  content:"+";position:absolute;right:2px;top:50%;transform:translateY(-50%);
  font-family:var(--font-body);font-weight:500;font-size:16px;color:var(--pine);
}
.cl-faq-list details[open] summary::after{content:"–"}
.cl-faq-list summary:focus-visible{outline:3px solid var(--pine);outline-offset:2px;border-radius:4px}
.cl-faq-list details p{
  font-family:var(--font-body);font-weight:500;font-size:13px;line-height:1.75;
  color:var(--ink);opacity:.82;margin:0 0 16px;max-width:52ch;
}


.cl-tail{
  margin-top:clamp(40px,6vh,64px);width:min(520px,100%);
  display:flex;flex-direction:column;align-items:center;text-align:center;
}
.cl-tail .cl-rule{margin-bottom:20px}
.cl-tail-title{
  font-family:var(--font-display);font-weight:400;font-size:clamp(22px,3vw,28px);
  color:var(--pine-deep);margin:0;
}
.cl-tail-lead{
  font-family:var(--font-body);font-weight:500;font-size:13px;line-height:1.7;
  color:var(--sand-ink);margin:10px 0 0;max-width:42ch;
}
.cl-midcta{margin-top:clamp(28px,4vh,40px)}
.cl-tail-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:18px}


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
  .cl-form{margin-top:26px;width:100%}
  .cl-seg{margin-bottom:14px}
  .cl-seg button{padding:15px 0;letter-spacing:.2em}
  .cl-fields{gap:14px}
  .cl-field{gap:5px}
  .cl-form input.cl-input{padding:15px 18px;font-size:16px}
  .cl-error{font-size:13.5px;line-height:1.45;padding:0 4px}
  .cl-label{font-size:10.5px;letter-spacing:.2em}
  .cl-cta{padding:18px 0;letter-spacing:.2em;margin-top:18px}
  .cl-hint{margin-top:12px}
  .cl-privacy{font-size:12px;line-height:1.65;padding:0 2px;margin-top:12px}
  .cl-held{margin-top:26px;width:100%}
  .cl-held h2{font-size:26px}
  .cl-num{font-size:clamp(48px,16vw,64px);margin:10px 0 4px}
  .cl-sub{font-size:16px}
  .cl-sub-quiet{font-size:13px}
  .cl-confirm{font-size:13.5px;padding:14px;margin-top:16px;max-width:none}
  .cl-held .cl-ghost{
    width:100%;margin-top:20px;padding:16px 12px;
    letter-spacing:.16em;font-size:10.5px;line-height:1.4;
  }

  .cl-how{margin-top:34px}
  .cl-how-title{font-size:23px;max-width:none}
  .cl-how-list{margin-top:20px}
  .cl-how-item{gap:12px;padding:16px 0}
  .cl-how-num{min-width:20px;font-size:14px}
  .cl-how-item h3{letter-spacing:.2em}
  .cl-preview{margin-top:34px}
  .cl-preview-figure{margin-top:20px}
  .cl-preview-scroll{
    overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;
    scroll-snap-type:x mandatory;
    border:1px solid hsl(0 0% 9% / .14);background:var(--bone-lift);
  }
  .cl-preview-scroll img{
    width:auto;height:auto;min-width:560px;max-width:none;
    border:0;border-radius:0;scroll-snap-align:center;
  }
  .cl-preview-hint{
    display:block;font-family:var(--font-body);font-weight:600;
    font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;
    color:var(--sand-ink);margin:10px 0 0;
  }
  .cl-preview-notes{grid-template-columns:1fr;gap:12px;margin-top:14px}
  .cl-preview-figure figcaption{margin-top:12px;font-size:12px}

  .cl-tools{margin-top:34px}

  .cl-quotes{margin-top:34px}
  .cl-benefits{margin-top:34px}
  .cl-faq{margin-top:34px}
  .cl-tail{margin-top:34px;width:100%}

  .cl-midcta{margin-top:26px}
  .cl-tail-title{font-size:22px}
  .cl-tail-lead{margin-top:8px;max-width:34ch}
  .cl-tail-actions{
    flex-direction:column;flex-wrap:nowrap;gap:10px;width:100%;margin-top:16px;
  }
  .cl-tail-actions .cl-ghost{width:100%;padding:15px 0;letter-spacing:.18em}
  .cl-faq-list summary{font-size:11px;padding:16px 28px 16px 0}
  .cl-quotes-list{gap:14px}
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
  .cl-mark,.cl-wordmark,.cl-aside,.cl-descriptor,.cl-form,.cl-held,.fl-countdown,.cl-how,.cl-preview,.cl-tools,.cl-quotes,.cl-benefits,.cl-faq,.cl-tail:not(.cl-midcta),.cl-contact{
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
  .cl-quotes{animation-delay:1.22s}
  .cl-benefits{animation-delay:1.23s}
  .cl-faq{animation-delay:1.24s}
  .cl-tail{animation-delay:1.25s}
  .cl-contact{animation-delay:1.25s}
  @keyframes cl-rise{to{opacity:1;transform:translateY(0)}}
}
`;

