/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Text } from 'npm:@react-email/components@0.0.22'
import { BrandShell, button, small, text } from './brand.tsx'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <BrandShell
    preview="Your sign-in link for On Tour Live"
    eyebrow="SIGN IN"
    heading="Your sign-in link"
  >
    <Text style={text}>
      Tap below to sign in to On Tour Live. For your security the link expires shortly and works
      once.
    </Text>
    <Button style={button} href={confirmationUrl}>
      SIGN IN
    </Button>
    <Text style={small}>
      Didn't ask to sign in? Ignore this email — your account stays locked.
    </Text>
  </BrandShell>
)

export default MagicLinkEmail
