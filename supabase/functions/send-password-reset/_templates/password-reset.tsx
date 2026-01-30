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

interface PasswordResetEmailProps {
  resetUrl: string;
  userEmail: string;
}

export const PasswordResetEmail = ({
  resetUrl,
  userEmail,
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your On Tour password</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Logo */}
        <Section style={logoSection}>
          <Text style={logo}>
            <span style={logoPrimary}>ON</span>
            <span style={logoSecondary}>TOUR</span>
          </Text>
        </Section>

        <Heading style={h1}>Reset Your Password</Heading>
        
        <Text style={text}>
          Hi there,
        </Text>
        
        <Text style={text}>
          We received a request to reset the password for your On Tour account 
          associated with <strong>{userEmail}</strong>.
        </Text>
        
        <Text style={text}>
          Click the button below to set a new password:
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={resetUrl}>
            Reset Password
          </Button>
        </Section>

        <Text style={text}>
          Or copy and paste this link into your browser:
        </Text>
        
        <Text style={linkText}>
          <Link href={resetUrl} style={link}>
            {resetUrl}
          </Link>
        </Text>

        <Hr style={hr} />

        <Text style={footerText}>
          This link will expire in 1 hour for security reasons.
        </Text>
        
        <Text style={footerText}>
          If you didn't request a password reset, you can safely ignore this email. 
          Your password will remain unchanged.
        </Text>

        <Hr style={hr} />

        <Text style={footer}>
          © 2026 On Tour. All rights reserved.
          <br />
          Connecting artists and venues worldwide.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default PasswordResetEmail

const main = {
  backgroundColor: '#0a0a0a',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
}

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
}

const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
}

const logo = {
  fontSize: '28px',
  fontWeight: 'bold',
  letterSpacing: '-0.5px',
}

const logoPrimary = {
  color: '#DAFF00',
}

const logoSecondary = {
  color: '#ffffff',
}

const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '30px 0',
  padding: '0',
}

const text = {
  color: '#a1a1aa',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#DAFF00',
  borderRadius: '12px',
  color: '#0a0a0a',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
}

const linkText = {
  color: '#a1a1aa',
  fontSize: '14px',
  lineHeight: '24px',
  wordBreak: 'break-all' as const,
}

const link = {
  color: '#DAFF00',
  textDecoration: 'underline',
}

const hr = {
  borderColor: '#27272a',
  margin: '32px 0',
}

const footerText = {
  color: '#71717a',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '12px 0',
}

const footer = {
  color: '#52525b',
  fontSize: '12px',
  lineHeight: '20px',
  textAlign: 'center' as const,
  marginTop: '24px',
}
