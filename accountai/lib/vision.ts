import { GoogleAuth } from 'google-auth-library'
import path from 'path'
import fs from 'fs'

// Resolve the service account JSON credential file
function getCredentialsPath(): string {
  // 1. Check GOOGLE_APPLICATION_CREDENTIALS env var
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS
  }
  // 2. Default to google-credentials.json in project root
  const defaultPath = path.join(process.cwd(), 'google-credentials.json')
  if (fs.existsSync(defaultPath)) {
    return defaultPath
  }
  throw new Error(
    'Google Cloud credentials not found. Place your service account JSON file as "google-credentials.json" in the project root, or set GOOGLE_APPLICATION_CREDENTIALS env var.'
  )
}

// Create authenticated client for Google Cloud Vision API
let authClient: GoogleAuth | null = null

function getAuth(): GoogleAuth {
  if (!authClient) {
    const credPath = getCredentialsPath()
    authClient = new GoogleAuth({
      keyFile: credPath,
      scopes: ['https://www.googleapis.com/auth/cloud-vision'],
    })
  }
  return authClient
}

export async function extractTextFromImage(base64Image: string): Promise<string> {
  const auth = getAuth()
  const client = await auth.getClient()
  const accessToken = await client.getAccessToken()

  if (!accessToken.token) {
    throw new Error('Failed to obtain access token from service account credentials')
  }

  const visionUrl = 'https://vision.googleapis.com/v1/images:annotate'

  const body = {
    requests: [
      {
        image: {
          content: base64Image,
        },
        features: [
          {
            type: 'DOCUMENT_TEXT_DETECTION',
          },
        ],
      },
    ],
  }

  const response = await fetch(visionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken.token}`,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to extract text using Google Cloud Vision')
  }

  const extractedText = data.responses?.[0]?.fullTextAnnotation?.text || ''
  return extractedText
}
