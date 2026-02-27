import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "https://esm.sh/@react-email/components@0.0.22";
import React from "https://esm.sh/react@18.3.1";

interface WelcomeEmailProps {
  userType: 'artist' | 'venue';
  userEmail: string;
  dashboardUrl: string;
}

const brand = {
  bg: '#ffffff',
  cardBg: '#0a0a0a',
  cardBorder: '#1f1f23',
  primary: '#c9a88c',
  foreground: '#ddd5cd',
  muted: '#8a7f77',
  mutedDark: '#3d3d3d',
  artistPink: '#d94f7a',
  venuePurple: '#9966cc',
};

export const WelcomeEmail = ({
  userType,
  userEmail,
  dashboardUrl,
}: WelcomeEmailProps) => {
  const isArtist = userType === 'artist';
  const accentColor = isArtist ? brand.artistPink : brand.venuePurple;

  const headline = isArtist
    ? "Welcome to On Tour, Artist!"
    : "Welcome to On Tour, Venue Partner!";

  const subheadline = isArtist
    ? "You're now part of a global network connecting talented artists with amazing venues."
    : "You're now part of a global network connecting venues with incredible talent.";

  const features = isArtist ? [
    { icon: "📍", title: "Set Your Travel Dates", description: "Let venues know when you'll be in their city" },
    { icon: "🎵", title: "Showcase Your Sound", description: "Connect your Spotify, Instagram, and more" },
    { icon: "💼", title: "Manage Bookings", description: "Accept gigs and negotiate offers directly" },
  ] : [
    { icon: "🔍", title: "Discover Artists", description: "Browse artists by genre, location, and availability" },
    { icon: "📅", title: "Post Entertainment Requests", description: "Let artists come to you with their offers" },
    { icon: "⭐", title: "Build Your Reputation", description: "Get reviews from artists you work with" },
  ];

  const ctaText = isArtist ? "Complete Your Profile" : "Start Discovering Artists";

  return (
    <Html>
      <Head />
      <Preview>{headline}</Preview>
      <Body style={main}>
        <Container style={outerContainer}>
          {/* Card */}
          <Section style={card}>
            {/* Header */}
            <Section style={header}>
              <Text style={logoText}>
                <span style={{ color: brand.primary, fontWeight: 900 }}>ON</span>
                <span style={{ color: '#ffffff', fontWeight: 900 }}>TOUR</span>
              </Text>
              <Text style={tagline}>Live Entertainment</Text>
            </Section>

            {/* Content */}
            <Section style={content}>
              <Text style={{ textAlign: 'center' as const, fontSize: '40px', margin: '0 0 12px' }}>🎉</Text>
              <Text style={h1}>{headline}</Text>
              <Text style={{ ...bodyText, textAlign: 'center' as const }}>
                Hi there! 👋
              </Text>
              <Text style={{ ...bodyText, textAlign: 'center' as const }}>
                {subheadline}
              </Text>

              {/* CTA */}
              <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
                <a href={dashboardUrl} style={{
                  display: 'inline-block',
                  backgroundColor: accentColor,
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '14px 36px',
                  borderRadius: '14px',
                  fontWeight: 600,
                  fontSize: '15px',
                  letterSpacing: '0.01em',
                }}>
                  {ctaText}
                </a>
              </Section>

              {/* Divider */}
              <Section style={{ borderTop: `1px solid ${brand.cardBorder}`, margin: '28px 0' }} />

              <Text style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
                Here's what you can do:
              </Text>

              {features.map((feature, index) => (
                <Section key={index} style={{ background: '#1a1a1e', borderRadius: '12px', padding: '16px 20px', marginBottom: '10px' }}>
                  <Text style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, margin: '0 0 4px' }}>
                    {feature.icon} {feature.title}
                  </Text>
                  <Text style={{ color: brand.muted, fontSize: '14px', margin: '0', lineHeight: '1.5' }}>
                    {feature.description}
                  </Text>
                </Section>
              ))}
            </Section>

            {/* Footer */}
            <Section style={footer}>
              <Text style={{ color: brand.mutedDark, fontSize: '13px', margin: '0 0 8px', lineHeight: '1.5' }}>
                You're receiving this because you signed up on{' '}
                <a href={dashboardUrl} style={{ color: brand.primary, textDecoration: 'none' }}>On Tour Live</a>.
              </Text>
              <Text style={{ color: brand.mutedDark, fontSize: '12px', margin: '0' }}>
                © {new Date().getFullYear()} On Tour Live. All rights reserved.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

const main = {
  backgroundColor: brand.bg,
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
  WebkitFontSmoothing: 'antialiased' as const,
};

const outerContainer = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '40px 20px',
};

const card = {
  backgroundColor: brand.cardBg,
  borderRadius: '20px',
  overflow: 'hidden' as const,
  border: `1px solid ${brand.cardBorder}`,
};

const header = {
  padding: '32px 40px 24px',
  textAlign: 'center' as const,
  borderBottom: `1px solid ${brand.cardBorder}`,
};

const logoText = {
  fontSize: '32px',
  letterSpacing: '-0.04em',
  lineHeight: '1',
  margin: '0 0 4px',
};

const tagline = {
  fontSize: '11px',
  letterSpacing: '0.2em',
  color: brand.muted,
  textTransform: 'uppercase' as const,
  margin: '2px 0 0',
};

const content = {
  padding: '36px 40px',
};

const h1 = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: 700,
  textAlign: 'center' as const,
  margin: '0 0 6px',
  letterSpacing: '-0.02em',
};

const bodyText = {
  color: brand.muted,
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '8px 0',
};

const footer = {
  padding: '24px 40px',
  borderTop: `1px solid ${brand.cardBorder}`,
  textAlign: 'center' as const,
};
