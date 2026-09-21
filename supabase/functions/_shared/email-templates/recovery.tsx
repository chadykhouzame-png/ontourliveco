/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Text } from 'npm:@react-email/components@0.0.22'
import { BrandShell, button, small, text } from './brand.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <BrandShell
    preview="Choose a new password for On Tour Live"
    eyebrow="PASSWORD RESET"
    heading="Choose a new password"
  >
    <Text style={text}>
      We got a request to reset the password on your On Tour Live account. Set a new one below.
    </Text>
    <Button style={button} href={confirmationUrl}>
      RESET PASSWORD
    </Button>
    <Text style={small}>
      Didn't request this? Ignore this email — your password stays as it is. If you think someone
      else is trying to get in, write to hello@ontour.live.
    </Text>
  </BrandShell>
)

export default RecoveryEmail
