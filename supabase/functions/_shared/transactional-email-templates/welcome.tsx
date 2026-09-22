/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
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
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  userType?: 'artist' | 'venue'
  dashboardUrl?: string
}

const Email = ({ userType = 'artist', dashboardUrl = 'https://ontourlive.co' }: Props) => {
  const isArtist = userType === 'venue' ? false : true
  const steps = isArtist
    ? [
        'Complete your profile so venues can find you.',
        'Add the dates and cities you can play.',
        'Reply to offers and agree the fee in one thread.',
      ]
    : [
        'Complete your venue profile.',
        'Post a night and see who is genuinely available.',
        'Agree the fee and keep every booking in one thread.',
      ]

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{isArtist ? 'Your artist account is ready' : 'Your venue account is ready'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={crest}>
            <Text style={wordmark}>ON TOUR LIVE</Text>
            <Text style={crestSub}>The booking app for artists &amp; venues</Text>
          </Section>

          <Section style={card}>
            <Text style={badge}>{isArtist ? 'ARTIST ACCOUNT' : 'VENUE ACCOUNT'}</Text>
            <Heading style={h1}>Welcome to On Tour Live</Heading>
            <Text style={lede}>
              Your account is ready. Here&apos;s how to get the most out of it.
            </Text>

            <Hr style={rule} />

            <Text style={label}>FIRST STEPS</Text>
            {steps.map((s, i) => (
              <Text key={i} style={step}>
                <span style={num}>{['I.', 'II.', 'III.'][i]}</span> {s}
              </Text>
            ))}

            <Section style={{ margin: '26px 0 0' }}>
              <Button href={dashboardUrl} style={button}>
                {isArtist ? 'Complete your profile' : 'Start discovering artists'}
              </Button>
            </Section>

            <Hr style={rule} />

            <Text style={small}>
              Questions? Just reply, or write to{' '}
              <Link href="mailto:hello@ontour.live" style={link}>hello@ontour.live</Link>.
            </Text>
            <Text style={sign}>— The On Tour Live team</Text>
          </Section>

          <Text style={foot}>ontourlive.co</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    data?.userType === 'venue'
      ? 'Welcome to On Tour Live — your venue account is ready'
      : 'Welcome to On Tour Live — your artist account is ready',
  displayName: 'Welcome — new account',
  previewData: { userType: 'artist', dashboardUrl: 'https://ontourlive.co/artist/setup' },
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
const crest = { padding: '0 0 20px', textAlign: 'center' as const }
const wordmark = {
  color: '#21402C',
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '4px',
  margin: '0 0 6px',
}
const crestSub = { color: '#8E8570', fontSize: '13px', fontStyle: 'italic' as const, margin: 0 }
const badge = {
  color: '#21402C',
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '2px',
  margin: '0 0 16px',
}
const h1 = { color: '#171512', fontSize: '30px', lineHeight: '36px', margin: '0 0 12px' }
const lede = { color: '#5C5445', fontSize: '16px', lineHeight: '25px', margin: 0 }
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
const button = {
  backgroundColor: '#21402C',
  borderRadius: '999px',
  color: '#EFE8DA',
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: '14px',
  padding: '13px 26px',
  textDecoration: 'none',
}
const small = { color: '#5C5445', fontSize: '14px', lineHeight: '22px', margin: '0 0 14px' }
const link = { color: '#21402C', textDecoration: 'underline' }
const sign = { color: '#5C5445', fontSize: '14px', fontStyle: 'italic' as const, margin: 0 }
const foot = {
  color: '#8E8570',
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: '11px',
  letterSpacing: '1px',
  margin: '18px 0 0',
  textAlign: 'center' as const,
}
