import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "https://esm.sh/@react-email/components@0.0.22";
import React from "https://esm.sh/react@18.3.1";

interface PasswordResetEmailProps {
  resetUrl: string;
  userEmail: string;
}

const brand = {
  bg: '#ffffff',
  cardBg: '#0a0a0a',
  cardBorder: '#1f1f23',
  primary: '#c9a88c',
  foreground: '#ddd5cd',
  muted: '#8a7f77',
  mutedDark: '#3d3d3d',
};

export const PasswordResetEmail = ({
  resetUrl,
  userEmail,
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your On Tour password</Preview>
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
            <Text style={{ textAlign: 'center' as const, fontSize: '40px', margin: '0 0 12px' }}>🔐</Text>
            <Text style={h1}>Reset Your Password</Text>
            <Text style={{ color: brand.muted, fontSize: '15px', margin: '0 0 4px', textAlign: 'center' as const }}>
              for <strong style={{ color: brand.foreground }}>{userEmail}</strong>
            </Text>

            <Text style={bodyText}>
              We received a request to reset the password for your On Tour account. Click the button below to set a new password:
            </Text>

            {/* CTA */}
            <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
              <a href={resetUrl} style={{
                display: 'inline-block',
                backgroundColor: brand.primary,
                color: '#ffffff',
                textDecoration: 'none',
                padding: '14px 36px',
                borderRadius: '14px',
                fontWeight: 600,
                fontSize: '15px',
                letterSpacing: '0.01em',
                minWidth: '180px',
              }}>
                Reset Password
              </a>
            </Section>

            <Text style={{ color: brand.muted, fontSize: '13px', lineHeight: '1.6', margin: '16px 0 0' }}>
              Or copy and paste this link into your browser:
            </Text>
            <Text style={{ fontSize: '13px', wordBreak: 'break-all' as const, margin: '4px 0 0' }}>
              <Link href={resetUrl} style={{ color: brand.primary, textDecoration: 'underline' }}>
                {resetUrl}
              </Link>
            </Text>

            {/* Security notice */}
            <Section style={{ borderTop: `1px solid ${brand.cardBorder}`, margin: '28px 0 0', paddingTop: '20px' }}>
              <Section style={{ background: '#1a1a1e', borderRadius: '12px', padding: '16px 20px' }}>
                <Text style={{ color: brand.foreground, fontSize: '14px', margin: '0 0 8px', lineHeight: '1.6' }}>
                  ⏱️ This link will expire in <strong>1 hour</strong> for security reasons.
                </Text>
                <Text style={{ color: brand.muted, fontSize: '13px', margin: '0', lineHeight: '1.6' }}>
                  If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                </Text>
              </Section>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={{ color: brand.mutedDark, fontSize: '13px', margin: '0 0 8px', lineHeight: '1.5' }}>
              You're receiving this because you have an account on{' '}
              <a href="#" style={{ color: brand.primary, textDecoration: 'none' }}>On Tour Live</a>.
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

export default PasswordResetEmail;

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
  margin: '20px 0 0',
};

const footer = {
  padding: '24px 40px',
  borderTop: `1px solid ${brand.cardBorder}`,
  textAlign: 'center' as const,
};
