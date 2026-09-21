/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { BrandShell, code, small, text } from './brand.tsx'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <BrandShell
    preview="Your On Tour Live verification code"
    eyebrow="VERIFICATION CODE"
    heading="Confirm it's you"
  >
    <Text style={text}>Enter this code to confirm your identity:</Text>
    <Text style={code}>{token}</Text>
    <Text style={small}>
      The code expires shortly. Didn't ask for it? Ignore this email and write to
      hello@ontour.live if you're concerned.
    </Text>
  </BrandShell>
)

export default ReauthenticationEmail
