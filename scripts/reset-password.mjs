#!/usr/bin/env node
// İstifadəçi adlarını göstərmək və ya parol sıfırlamaq üçün.
//
// Bütün istifadəçiləri sadala:
//   node scripts/reset-password.mjs
//
// Bir istifadəçinin parolunu sıfırla:
//   node scripts/reset-password.mjs --user <username> --password <yeniParol>
//   (ilk girişdə parol dəyişməyi məcbur etmək üçün sonuna --force-change əlavə et)
//
// .env.local faylında FIREBASE_* dəyişənləri olmalıdır (lib/firebase-admin.ts ilə eyni).
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// .env.local oxu
const envPath = path.join(__dirname, '..', '.env.local')
try {
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
  }
} catch {}

const { default: admin } = await import('firebase-admin')
const { default: bcrypt } = await import('bcryptjs')

const app = admin.apps.length ? admin.apps[0] : admin.initializeApp(
  process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
    ? {
        credential: admin.credential.cert(
          JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'))
        ),
      }
    : {
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
      }
)

const db = admin.firestore(app)

// Arqumentləri oxu
const args = process.argv.slice(2)
function getArg(name) {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const username = getArg('--user')
const newPassword = getArg('--password')
const forceChange = args.includes('--force-change')

async function listUsers() {
  const snap = await db.collection('users').get()
  if (snap.empty) {
    console.log('⚠️  "users" kolleksiyasında heç bir istifadəçi yoxdur.')
    return
  }
  console.log(`\n${snap.size} istifadəçi tapıldı:\n`)
  console.log('username'.padEnd(24), 'displayName'.padEnd(28), 'role'.padEnd(14), 'aktiv')
  console.log('-'.repeat(78))
  for (const d of snap.docs) {
    const u = d.data()
    console.log(
      String(u.username ?? '').padEnd(24),
      String(u.displayName ?? '').padEnd(28),
      String(u.role ?? '').padEnd(14),
      u.isActive === false ? 'xeyr' : 'bəli'
    )
  }
  console.log('\nParol sıfırlamaq üçün:')
  console.log('  node scripts/reset-password.mjs --user <username> --password <yeniParol>\n')
}

async function resetPassword() {
  const snap = await db.collection('users').where('username', '==', username).limit(1).get()
  if (snap.empty) {
    console.error(`❌ "${username}" adlı istifadəçi tapılmadı. Əvvəlcə siyahıya bax:`)
    console.error('   node scripts/reset-password.mjs')
    process.exit(1)
  }
  const doc = snap.docs[0]
  const passwordHash = await bcrypt.hash(newPassword, 12)
  await doc.ref.update({
    passwordHash,
    mustChangePassword: forceChange,
    isActive: true,
    updatedAt: new Date().toISOString(),
  })
  console.log(`✅ "${username}" üçün yeni parol təyin edildi.`)
  console.log(`   Giriş: username="${username}", password="${newPassword}"`)
  if (forceChange) console.log('   (İlk girişdə parolu dəyişməsi istəniləcək.)')
}

async function main() {
  if (username && newPassword) {
    await resetPassword()
  } else if (username || newPassword) {
    console.error('❌ Həm --user, həm də --password birlikdə verilməlidir.')
    process.exit(1)
  } else {
    await listUsers()
  }
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
