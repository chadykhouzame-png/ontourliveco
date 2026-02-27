import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="On Tour Live" className="h-16 w-auto" />
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: February 27, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground [&_h2]:text-foreground [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-foreground [&_h3]:font-medium [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2">
          <p>
            On Tour Live ("we", "us", or "our") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your information when you use our platform at app.ontourlive.co.
          </p>

          <h2>1. Information We Collect</h2>
          <h3>Account Information</h3>
          <ul>
            <li>Email address and password</li>
            <li>First and last name</li>
            <li>Artist name or venue name</li>
            <li>City/location</li>
            <li>Profile images</li>
            <li>Bio and description</li>
            <li>Social media URLs (Instagram, Spotify, TikTok, SoundCloud)</li>
          </ul>

          <h3>Booking & Payment Information</h3>
          <ul>
            <li>Booking requests, dates, and times</li>
            <li>Offer amounts and negotiations</li>
            <li>Payment information is processed by Stripe — we do not store credit card details</li>
            <li>Stripe Connect account information for Artist payouts</li>
          </ul>

          <h3>Usage Information</h3>
          <ul>
            <li>Pages viewed and features used</li>
            <li>Search queries and filters</li>
            <li>Device type, browser, and operating system</li>
            <li>IP address</li>
            <li>Error logs and performance data</li>
          </ul>

          <h3>Communications</h3>
          <ul>
            <li>Messages sent between Artists and Venues through our messaging system</li>
            <li>Notification preferences</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To create and manage your account</li>
            <li>To facilitate connections, bookings, and payments between Artists and Venues</li>
            <li>To display your public profile to other users</li>
            <li>To send transactional emails (booking confirmations, password resets, welcome emails)</li>
            <li>To send notifications about booking requests, messages, and platform updates</li>
            <li>To improve and maintain the Platform's functionality and security</li>
            <li>To monitor and prevent fraud, abuse, and security issues</li>
            <li>To comply with legal obligations</li>
          </ul>

          <h2>3. Information Sharing</h2>
          <p>We do not sell your personal information. We may share your information with:</p>
          <ul>
            <li><strong>Other users:</strong> Your public profile information is visible to other platform users (Artists and Venues).</li>
            <li><strong>Stripe:</strong> Payment and payout processing.</li>
            <li><strong>Resend:</strong> Transactional email delivery.</li>
            <li><strong>Sentry:</strong> Error tracking and performance monitoring (anonymized).</li>
            <li><strong>Google:</strong> Location autocomplete services.</li>
            <li><strong>Legal authorities:</strong> When required by law or to protect our rights.</li>
          </ul>

          <h2>4. Data Security</h2>
          <ul>
            <li>All data is transmitted over encrypted connections (HTTPS/TLS).</li>
            <li>Passwords are hashed and never stored in plain text.</li>
            <li>Row-level security policies restrict database access to authorized users.</li>
            <li>Account lockout mechanisms protect against brute-force attacks.</li>
            <li>OAuth tokens are encrypted at rest.</li>
            <li>We conduct regular security reviews of our platform.</li>
          </ul>

          <h2>5. Data Retention</h2>
          <ul>
            <li>Account data is retained as long as your account is active.</li>
            <li>Error logs are automatically deleted after 30 days.</li>
            <li>Login attempt records are cleared after 24 hours.</li>
            <li>Password reset rate limits are cleared after 24 hours.</li>
            <li>You may request deletion of your account and associated data at any time.</li>
          </ul>

          <h2>6. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul>
            <li>Access and receive a copy of your personal data</li>
            <li>Correct inaccurate personal data</li>
            <li>Request deletion of your personal data</li>
            <li>Object to or restrict processing of your data</li>
            <li>Data portability</li>
            <li>Withdraw consent at any time</li>
          </ul>

          <h2>7. Cookies & Tracking</h2>
          <p>
            We use essential cookies for authentication and session management. We use Sentry for error tracking and performance monitoring, which may set cookies. We do not use third-party advertising cookies.
          </p>

          <h2>8. Children's Privacy</h2>
          <p>
            On Tour Live is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal data, we will delete it promptly.
          </p>

          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on the Platform or sending you an email. Your continued use after changes are posted constitutes acceptance of the updated policy.
          </p>

          <h2>10. Contact</h2>
          <p>
            If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact us at{" "}
            <a href="mailto:hello@ontourlive.co" className="text-primary hover:underline">
              hello@ontourlive.co
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
