#!/usr/bin/env node
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env.local')
try {
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
  }
} catch {}

const { default: admin } = await import('firebase-admin')
const app = admin.apps.length ? admin.apps[0] : admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
})
const db = admin.firestore(app)

// Get workspaceId from existing
const snap = await db.collection('team').limit(1).get()
const wsId = snap.docs[0]?.data().workspaceId || ''

const BIRBANK_DEPT = 'Təşkilati inkişaf və HR texnologiyaları departamenti'
const BIRBANK_DIV  = 'HR TechOps, performans və data funksional sahəsi'
const BIRBANK_SEC  = 'Ecosystem HR operations & Service delivery'

// These two were lost due to duplicate first names (two Aytəns, two Fəridəs)
const missing = [
  {
    workspaceId: wsId,
    name: 'Cavadova Aytən Rəhim qızı',
    personalCode: '10620', finCode: '1EK2RQK',
    company: 'Birbank', department: BIRBANK_DEPT,
    division: BIRBANK_DIV, section: BIRBANK_SEC,
    position: 'Baş mütəxəssis', role: 'Baş mütəxəssis',
    email: '', phone: '', avatar: '',
    createdAt: new Date().toISOString(),
  },
  {
    workspaceId: wsId,
    name: 'Abasova Fəridə Ələddin qızı',
    personalCode: '14793', finCode: '6K3M526',
    company: 'Birbank', department: BIRBANK_DEPT,
    division: BIRBANK_DIV, section: BIRBANK_SEC,
    position: 'Aparıcı mütəxəssis', role: 'Aparıcı mütəxəssis',
    email: '', phone: '', avatar: '',
    createdAt: new Date().toISOString(),
  },
]

const batch = db.batch()
for (const m of missing) {
  batch.set(db.collection('team').doc(), m)
}
await batch.commit()
console.log('Added 2 missing members: Cavadova Aytən + Abasova Fəridə')
process.exit(0)
