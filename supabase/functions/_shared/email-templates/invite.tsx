/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Button, Text } from 'npm:@react-email/components@0.0.22'
import { BrandShell, button, small, text } from './brand.tsx'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <BrandShell
    preview="You've been invited to join On Tour Live"
    eyebrow="INVITATION"
    heading="You've been invited"
  >
    <Text style={text}>
      Someone has invited you to On Tour Live — where artists and venues find each other, agree the
      fee, and keep it all in one thread. Accept below to set up your account.
    </Text>
    <Button style={button} href={confirmationUrl}>
      ACCEPT INVITATION
    </Button>
    <Text style={small}>Weren't expecting this? You can safely ignore this email.</Text>
  </BrandShell>
)

export default InviteEmail
