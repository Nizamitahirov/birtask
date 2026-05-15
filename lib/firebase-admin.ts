import * as admin from 'firebase-admin'

let _db: admin.firestore.Firestore | null = null
let _auth: admin.auth.Auth | null = null

function getApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const sa = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
    )
    return admin.initializeApp({ credential: admin.credential.cert(sa) })
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  })
}

export function getAdminDb(): admin.firestore.Firestore {
  if (!_db) _db = admin.firestore(getApp())
  return _db
}

export function getAdminAuth(): admin.auth.Auth {
  if (!_auth) _auth = admin.auth(getApp())
  return _auth
}

// Backward-compatible lazy proxies so existing route files don't need changing
export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_, prop: string) {
    return (getAdminDb() as unknown as Record<string, unknown>)[prop]
  },
})

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(_, prop: string) {
    return (getAdminAuth() as unknown as Record<string, unknown>)[prop]
  },
})
