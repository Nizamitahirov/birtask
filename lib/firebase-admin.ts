import * as admin from 'firebase-admin'

function getApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!

  // Support base64-encoded full service account JSON (most reliable for Vercel)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const sa = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
    )
    return admin.initializeApp({ credential: admin.credential.cert(sa) })
  }

  // Fallback: individual env vars (private key must have real newlines)
  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  })
}

export const adminApp = getApp()
export const adminDb = admin.firestore(adminApp)
export const adminAuth = admin.auth(adminApp)
