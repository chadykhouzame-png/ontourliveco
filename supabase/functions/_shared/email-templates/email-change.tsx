/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Text } from 'npm:@react-email/components@0.0.22'
import { BrandShell, button, small, text } from './brand.tsx'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <BrandShell
    preview="Confirm the new email address on your On Tour Live account"
    eyebrow="EMAIL CHANGE"
    heading="Confirm your new email"
  >
    <Text style={text}>
      You asked to move your On Tour Live account from {oldEmail} to {newEmail}. Confirm below and
      we'll make the switch.
    </Text>
    <Button style={button} href={confirmationUrl}>
      CONFIRM NEW EMAIL
    </Button>
    <Text style={small}>
      Didn't request this? Write to hello@ontour.live straight away so we can secure your account.
    </Text>
  </BrandShell>
)

export default EmailChangeEmail
