/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  firstName?: string
  venueName?: string
}

const Email = ({ firstName, venueName }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your venue is on the On Tour Live founding list.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={eyebrow}>ON TOUR LIVE</Text>
          <Heading style={h1}>You're on the list</Heading>
          <Text style={lede}>
            {firstName ? `${firstName}, thanks` : 'Thanks'} for joining as a venue
            {venueName ? ` — we've noted ${venueName}.` : '.'}
          </Text>

          <Hr style={rule} />

          <Text style={label}>WHAT HAPPENS NEXT</Text>
          <Text style={step}>
            <span style={num}>I.</span> We'll email you the moment On Tour Live opens in your city.
          </Text>
          <Text style={step}>
            <span style={num}>II.</span> Founding venues get early access to the artist roster
            before it opens publicly.
          </Text>
          <Text style={step}>
            <span style={num}>III.</span> At launch you'll post a night, see who's genuinely
            available, and agree the fee in one thread.
          </Text>

          <Hr style={rule} />

          <Text style={small}>
            Nothing to do for now — just keep an eye on your inbox. Questions? Reply here or write
            to <Link href="mailto:hello@ontour.live" style={link}>hello@ontour.live</Link>.
          </Text>
          <Text style={sign}>— The On Tour Live team</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your venue is on the On Tour Live founding list',
  displayName: 'Waitlist confirmation — Venue',
  previewData: { firstName: 'Daniel', venueName: 'The Lantern Room' },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "Georgia, 'Times New Roman', serif",
  margin: 0,
  padding: '24px 0',
}
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 16px' }
const card = {
  backgroundColor: '#EFE8DA',
  border: '1px solid #D9CFBC',
  borderRadius: '14px',
  padding: '36px 32px',
}
const eyebrow = {
  color: '#5C5445',
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: '11px',
  letterSpacing: '2px',
  margin: '0 0 18px',
}
const h1 = { color: '#171512', fontSize: '30px', lineHeight: '36px', margin: '0 0 12px' }
const lede = { color: '#5C5445', fontSize: '16px', lineHeight: '25px', margin: '0' }
const rule = { borderColor: '#D9CFBC', margin: '26px 0' }
const label = {
  color: '#21402C',
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: '11px',
  letterSpacing: '1.6px',
  margin: '0 0 12px',
}
const step = { color: '#171512', fontSize: '15px', lineHeight: '23px', margin: '0 0 10px' }
const num = { color: '#21402C', fontStyle: 'italic' as const, marginRight: '8px' }
const small = { color: '#5C5445', fontSize: '14px', lineHeight: '22px', margin: '0 0 14px' }
const link = { color: '#21402C', textDecoration: 'underline' }
const sign = { color: '#5C5445', fontSize: '14px', fontStyle: 'italic' as const, margin: 0 }
