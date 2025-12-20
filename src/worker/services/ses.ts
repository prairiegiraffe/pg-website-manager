import type { Env } from '../index'

interface EmailParams {
  subject: string
  body: string
}

// AWS Signature V4 signing for SES
export async function sendEmailAlert(env: Env, params: EmailParams): Promise<void> {
  const region = env.AWS_REGION ?? 'us-east-1'
  const accessKeyId = env.AWS_ACCESS_KEY_ID!
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY!
  const fromEmail = env.ALERT_FROM_EMAIL!
  const toEmail = env.ALERT_TO_EMAIL!

  const host = `email.${region}.amazonaws.com`
  const endpoint = `https://${host}/v2/email/outbound-emails`

  const body = JSON.stringify({
    FromEmailAddress: fromEmail,
    Destination: {
      ToAddresses: [toEmail],
    },
    Content: {
      Simple: {
        Subject: {
          Data: params.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: params.body,
            Charset: 'UTF-8',
          },
        },
      },
    },
  })

  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Host': host,
    'X-Amz-Date': amzDate,
  }

  // Create canonical request
  const canonicalUri = '/v2/email/outbound-emails'
  const canonicalQueryString = ''
  const signedHeaders = Object.keys(headers).map(k => k.toLowerCase()).sort().join(';')
  const canonicalHeaders = Object.entries(headers)
    .map(([k, v]) => `${k.toLowerCase()}:${v.trim()}`)
    .sort()
    .join('\n') + '\n'

  const payloadHash = await sha256(body)
  const canonicalRequest = [
    'POST',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256'
  const credentialScope = `${dateStamp}/${region}/ses/aws4_request`
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    await sha256(canonicalRequest),
  ].join('\n')

  // Calculate signature
  const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp)
  const kRegion = await hmacSha256(kDate, region)
  const kService = await hmacSha256(kRegion, 'ses')
  const kSigning = await hmacSha256(kService, 'aws4_request')
  const signature = await hmacSha256Hex(kSigning, stringToSign)

  // Add authorization header
  const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  headers['Authorization'] = authorizationHeader

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`SES API failed: ${response.status} ${errorText}`)
  }
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hmacSha256(key: string | ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const keyData = typeof key === 'string' ? encoder.encode(key) : key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message))
}

async function hmacSha256Hex(key: ArrayBuffer, message: string): Promise<string> {
  const result = await hmacSha256(key, message)
  return Array.from(new Uint8Array(result))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
