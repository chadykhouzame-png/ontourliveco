import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
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

export const WelcomeEmail = ({
  userType,
  userEmail,
  dashboardUrl,
}: WelcomeEmailProps) => {
  const isArtist = userType === 'artist';
  
  const headline = isArtist 
    ? "Welcome to On Tour, Artist!" 
    : "Welcome to On Tour, Venue Partner!";
  
  const subheadline = isArtist
    ? "You're now part of a global network connecting talented artists with amazing venues."
    : "You're now part of a global network connecting venues with incredible talent.";

  const features = isArtist ? [
    { title: "📍 Set Your Travel Dates", description: "Let venues know when you'll be in their city" },
    { title: "🎵 Showcase Your Sound", description: "Connect your Spotify, Instagram, and more" },
    { title: "💼 Manage Bookings", description: "Accept gigs and negotiate offers directly" },
  ] : [
    { title: "🔍 Discover Artists", description: "Browse artists by genre, location, and availability" },
    { title: "📅 Post Entertainment Requests", description: "Let artists come to you with their offers" },
    { title: "⭐ Build Your Reputation", description: "Get reviews from artists you work with" },
  ];

  const ctaText = isArtist ? "Complete Your Profile" : "Start Discovering Artists";
  const accentColor = isArtist ? "#A855F7" : "#3B82F6"; // Purple for artists, blue for venues

  return (
    <Html>
      <Head />
      <Preview>{headline}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoSection}>
            <Text style={logo}>
              <span style={logoPrimary}>ON</span>
              <span style={logoSecondary}>TOUR</span>
            </Text>
          </Section>

          <Heading style={h1}>{headline}</Heading>
          
          <Text style={text}>
            Hi there! 👋
          </Text>
          
          <Text style={text}>
            {subheadline}
          </Text>

          <Section style={buttonContainer}>
            <Button style={{ ...button, backgroundColor: accentColor }} href={dashboardUrl}>
              {ctaText}
            </Button>
          </Section>

          <Hr style={hr} />

          <Heading style={h2}>Here's what you can do:</Heading>

          {features.map((feature, index) => (
            <Section key={index} style={featureSection}>
              <Text style={featureTitle}>{feature.title}</Text>
              <Text style={featureDescription}>{feature.description}</Text>
            </Section>
          ))}

          <Hr style={hr} />

          <Text style={footerText}>
            Need help getting started? Just reply to this email - we're here to help!
          </Text>

          <Text style={footer}>
            © 2026 On Tour. All rights reserved.
            <br />
            Connecting artists and venues worldwide.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

const main = {
  backgroundColor: '#0a0a0a',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
};

const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const logo = {
  fontSize: '28px',
  fontWeight: 'bold',
  letterSpacing: '-0.5px',
};

const logoPrimary = {
  color: '#DAFF00',
};

const logoSecondary = {
  color: '#ffffff',
};

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '30px 0 20px',
  padding: '0',
};

const h2 = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '24px 0 16px',
  padding: '0',
};

const text = {
  color: '#a1a1aa',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  borderRadius: '12px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
};

const hr = {
  borderColor: '#27272a',
  margin: '32px 0',
};

const featureSection = {
  marginBottom: '16px',
};

const featureTitle = {
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 4px',
};

const featureDescription = {
  color: '#71717a',
  fontSize: '14px',
  margin: '0',
  lineHeight: '22px',
};

const footerText = {
  color: '#71717a',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '12px 0',
  textAlign: 'center' as const,
};

const footer = {
  color: '#52525b',
  fontSize: '12px',
  lineHeight: '20px',
  textAlign: 'center' as const,
  marginTop: '24px',
};
