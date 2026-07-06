import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLockup } from '@/components/BrandLockup';
import { ThemeToggle } from '@/components/ThemeToggle';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandLockup size="lg" lazy={false} />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-10">Last updated: February 27, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground [&_h2]:text-foreground [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-foreground [&_h3]:font-medium [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2">
          <p>
            Welcome to On Tour Live ("Platform", "we", "us", or "our"). By accessing or using our platform at app.ontourlive.co, you agree to be bound by these Terms of Service ("Terms"). Please read them carefully.
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By creating an account, accessing, or using On Tour Live, you agree to these Terms and our Privacy Policy. If you do not agree, you may not use the Platform. We reserve the right to update these Terms at any time, and your continued use constitutes acceptance of any changes.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            On Tour Live is a marketplace connecting live entertainment artists ("Artists") with venues ("Venues"). We facilitate discovery, communication, booking, and payment between Artists and Venues. We are not a party to any agreement between Artists and Venues.
          </p>

          <h2>3. Account Registration</h2>
          <ul>
            <li>You must be at least 18 years old to create an account.</li>
            <li>You must provide accurate, current, and complete information during registration.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>You must notify us immediately of any unauthorized use of your account.</li>
          </ul>

          <h2>4. User Roles</h2>
          <h3>Artists</h3>
          <p>
            Artists may create profiles, list their availability and travel dates, set fee ranges, receive and respond to booking requests, and receive payments through the Platform.
          </p>
          <h3>Venues</h3>
          <p>
            Venues may create profiles, search for and discover artists, submit booking requests, communicate with artists, and make payments through the Platform.
          </p>

          <h2>5. Bookings & Payments</h2>
          <ul>
            <li>Booking requests are not binding until accepted by the Artist and payment is confirmed.</li>
            <li>Payments are processed through Stripe. By using our payment features, you also agree to Stripe's terms of service.</li>
            <li>On Tour Live charges a platform fee on each completed booking. This fee is disclosed before payment is made.</li>
            <li>Artists must complete Stripe Connect onboarding to receive payouts.</li>
            <li>Refund and cancellation policies are governed by the terms agreed upon between the Artist and Venue at the time of booking.</li>
          </ul>

          <h2>6. Disputes</h2>
          <p>
            If a dispute arises between an Artist and a Venue, either party may submit a dispute through the Platform. On Tour Live may, at its discretion, review and mediate disputes but is not obligated to resolve them. Our decision, if rendered, is final.
          </p>

          <h2>7. Content & Conduct</h2>
          <ul>
            <li>You retain ownership of content you upload (profile images, bios, media).</li>
            <li>By uploading content, you grant On Tour Live a non-exclusive, worldwide license to display and distribute it in connection with the Platform.</li>
            <li>You may not upload content that is illegal, defamatory, infringing, or harmful.</li>
            <li>You may not use the Platform to harass, spam, or deceive other users.</li>
            <li>On Tour Live reserves the right to remove content or suspend accounts that violate these Terms.</li>
          </ul>

          <h2>8. Profile Review & Approval</h2>
          <p>
            All profiles are subject to review and approval by On Tour Live. We reserve the right to reject, suspend, or remove any profile at our sole discretion for any reason, including but not limited to incomplete information, misleading content, or violations of these Terms.
          </p>

          <h2>9. Intellectual Property</h2>
          <p>
            The On Tour Live name, logo, and all related branding are the property of On Tour Live. You may not use our trademarks without prior written consent. The Platform's design, code, and features are protected by copyright and other intellectual property laws.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, On Tour Live shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform. Our total liability shall not exceed the fees paid by you to On Tour Live in the 12 months preceding the claim.
          </p>

          <h2>11. Disclaimers</h2>
          <ul>
            <li>The Platform is provided "as is" without warranties of any kind.</li>
            <li>We do not guarantee the quality, safety, or legality of any Artist's performance or Venue's premises.</li>
            <li>We do not endorse or verify the identity of any user beyond our standard review process.</li>
          </ul>

          <h2>12. Termination</h2>
          <p>
            We may suspend or terminate your account at any time for violations of these Terms or for any reason at our sole discretion. You may delete your account at any time by contacting us. Upon termination, your right to use the Platform ceases immediately.
          </p>

          <h2>13. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with applicable law. Any disputes arising from these Terms shall be resolved through binding arbitration or in the courts of competent jurisdiction.
          </p>

          <h2>14. Contact</h2>
          <p>
            If you have any questions about these Terms, please contact us at{" "}
            <a href="mailto:hello@ontourlive.co" className="text-primary hover:underline">
              hello@ontourlive.co
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
