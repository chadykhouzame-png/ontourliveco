/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Text } from 'npm:@react-email/components@0.0.22'
import { BrandShell, button, small, text } from './brand.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ recipient, confirmationUrl }: SignupEmailProps) => (
  <BrandShell
    preview="Confirm your email to finish setting up On Tour Live"
    eyebrow="CONFIRM YOUR EMAIL"
    heading="One tap and you're in"
  >
    <Text style={text}>
      Welcome to On Tour Live. Confirm {recipient ? recipient : 'your email address'} and your
      account is ready to use.
    </Text>
    <Button style={button} href={confirmationUrl}>
      CONFIRM EMAIL
    </Button>
    <Text style={small}>
      Didn't create an account? Ignore this email and nothing happens.
    </Text>
  </BrandShell>
)

export default SignupEmail
