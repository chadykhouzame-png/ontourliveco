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
  artistName?: string
}

const Email = ({ firstName, artistName }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're on the On Tour Live founding list.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={eyebrow}>ON TOUR LIVE</Text>
          <Heading style={h1}>You're on the list</Heading>
          <Text style={lede}>
            {firstName ? `${firstName}, thanks` : 'Thanks'} for joining as an artist
            {artistName ? ` — we've noted you as ${artistName}.` : '.'}
          </Text>

          <Hr style={rule} />

          <Text style={label}>WHAT HAPPENS NEXT</Text>
          <Text style={step}>
            <span style={num}>I.</span> We'll email you the moment On Tour Live opens in your city.
          </Text>
          <Text style={step}>
            <span style={num}>II.</span> Founding artists get first access to open slots before
            they go public.
          </Text>
          <Text style={step}>
            <span style={num}>III.</span> When we launch, you'll set up your profile, availability
            and fees in a few minutes.
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
  subject: 'You\u2019re on the On Tour Live founding list',
  displayName: 'Waitlist confirmation — Artist',
  previewData: { firstName: 'Mia', artistName: 'Mia Fontaine' },
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
