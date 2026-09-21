/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

// On Tour Live brand tokens (kept in sync with the landing page palette).
export const BRAND = {
  ink: '#171512',
  pine: '#21402C',
  pineDeep: '#182F20',
  bone: '#EFE8DA',
  boneEdge: '#D9CFBC',
  sandInk: '#5C5445',
  sand: '#8E8570',
  site: 'https://ontourlive.co',
  logo: 'https://ontourlive.co/favicon.png',
  support: 'hello@ontour.live',
  serif: "Georgia, 'Times New Roman', serif",
  sans: 'Arial, Helvetica, sans-serif',
}

interface ShellProps {
  preview: string
  eyebrow: string
  heading: string
  children: React.ReactNode
}

/** Shared On Tour Live wrapper: crest, bone card, support footer. */
export const BrandShell = ({ preview, eyebrow, heading, children }: ShellProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={crest}>
          <Img src={BRAND.logo} width="52" height="52" alt="On Tour Live" style={logo} />
          <Text style={wordmark}>ON TOUR LIVE</Text>
          <Text style={crestSub}>The booking app for artists &amp; venues</Text>
        </Section>

        <Section style={card}>
          <Text style={badge}>{eyebrow}</Text>
          <Heading style={h1}>{heading}</Heading>
          {children}
        </Section>

        <Hr style={footRule} />
        <Text style={foot}>
          Need a hand? Write to{' '}
          <Link href={`mailto:${BRAND.support}`} style={footLink}>
            {BRAND.support}
          </Link>
          {' '}— a real person replies.
        </Text>
        <Text style={foot}>
          <Link href={BRAND.site} style={footLink}>
            ontourlive.co
          </Link>
          {' '}· Sydney, Australia
        </Text>
      </Container>
    </Body>
  </Html>
)

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: BRAND.serif,
  margin: 0,
  padding: '24px 0',
}
export const container = { maxWidth: '560px', margin: '0 auto', padding: '0 16px' }
const crest = { padding: '0 0 20px', textAlign: 'center' as const }
const logo = { borderRadius: '12px', display: 'block', margin: '0 auto 12px' }
const wordmark = {
  color: BRAND.pine,
  fontFamily: BRAND.sans,
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '4px',
  margin: '0 0 6px',
}
const crestSub = {
  color: BRAND.sand,
  fontSize: '13px',
  fontStyle: 'italic' as const,
  margin: 0,
}
export const card = {
  backgroundColor: BRAND.bone,
  border: `1px solid ${BRAND.boneEdge}`,
  borderRadius: '14px',
  padding: '36px 32px',
}
const badge = {
  color: BRAND.pine,
  fontFamily: BRAND.sans,
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '2px',
  margin: '0 0 16px',
}
const h1 = {
  color: BRAND.ink,
  fontSize: '28px',
  lineHeight: '34px',
  margin: '0 0 14px',
}
export const text = {
  color: BRAND.sandInk,
  fontSize: '16px',
  lineHeight: '25px',
  margin: '0 0 20px',
}
export const link = { color: BRAND.pine, textDecoration: 'underline' }
export const button = {
  backgroundColor: BRAND.pine,
  border: `1px solid ${BRAND.pineDeep}`,
  borderRadius: '999px',
  color: '#EFE8DA',
  display: 'inline-block',
  fontFamily: BRAND.sans,
  fontSize: '14px',
  fontWeight: 700,
  letterSpacing: '1px',
  padding: '14px 28px',
  textDecoration: 'none',
}
export const rule = { borderColor: BRAND.boneEdge, margin: '26px 0' }
export const small = {
  color: BRAND.sandInk,
  fontSize: '14px',
  lineHeight: '22px',
  margin: '24px 0 0',
}
export const code = {
  backgroundColor: '#ffffff',
  border: `1px solid ${BRAND.boneEdge}`,
  borderRadius: '10px',
  color: BRAND.ink,
  display: 'inline-block',
  fontFamily: 'Courier, monospace',
  fontSize: '26px',
  fontWeight: 700,
  letterSpacing: '6px',
  margin: '0 0 8px',
  padding: '14px 22px',
}
const footRule = { borderColor: BRAND.boneEdge, margin: '22px 0 16px' }
const foot = {
  color: BRAND.sand,
  fontFamily: BRAND.sans,
  fontSize: '12px',
  lineHeight: '19px',
  margin: '0 0 4px',
  textAlign: 'center' as const,
}
const footLink = { color: BRAND.pine, textDecoration: 'underline' }
