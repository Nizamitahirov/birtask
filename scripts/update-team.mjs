#!/usr/bin/env node
// Run with: node scripts/update-team.mjs
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Parse .env.local manually
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

// ─── New team data ────────────────────────────────────────────────────────────
const BIRBANK_DEPT = 'Təşkilati inkişaf və HR texnologiyaları departamenti'
const BIRBANK_DIV  = 'HR TechOps, performans və data funksional sahəsi'
const BIRBANK_SEC_DEFAULT = 'Ecosystem HR operations & Service delivery'
const PASHAPAY_DEPT = 'İnsan Resurslarının İdarə Edilməsi'
const PASHAPAY_DIV  = 'İR Əməliyyatları'
const BIRMARKET_DEPT = 'İnsanlar və korporativ mədəniyyət departamenti'
const BIRMARKET_DIV  = 'İnsan Resursları əməliyyatları və əmək haqqı hesablanması şöbəsi'

const NEW_MEMBERS = [
  // ── Birbank ──
  { name:'Tahirov Nizami Bəylər oğlu',          personalCode:'18021',   finCode:'5UT8RLF', company:'Birbank', department:BIRBANK_DEPT, division:BIRBANK_DIV, section:BIRBANK_SEC_DEFAULT,           position:'Funksional lider' },
  { name:'Cəfərova Aida İdrət qızı',            personalCode:'120019',  finCode:'1E1LYM0', company:'Birbank', department:BIRBANK_DEPT, division:BIRBANK_DIV, section:BIRBANK_SEC_DEFAULT,           position:'Menecer' },
  { name:'Cavadova Aytən Rəhim qızı',           personalCode:'10620',   finCode:'1EK2RQK', company:'Birbank', department:BIRBANK_DEPT, division:BIRBANK_DIV, section:BIRBANK_SEC_DEFAULT,           position:'Baş mütəxəssis' },
  { name:'Cəlilova Elmira Şirin qızı',          personalCode:'10010',   finCode:'1J4739P', company:'Birbank', department:BIRBANK_DEPT, division:BIRBANK_DIV, section:BIRBANK_SEC_DEFAULT,           position:'Baş mütəxəssis' },
  { name:'Məlikov Ülvi Nəcəf oğlu',             personalCode:'12773',   finCode:'68G2L6S', company:'Birbank', department:BIRBANK_DEPT, division:BIRBANK_DIV, section:BIRBANK_SEC_DEFAULT,           position:'Aparıcı mütəxəssis' },
  { name:'Musaxanova Svetlana Allahverən qızı',  personalCode:'11745',   finCode:'2PAXLDJ', company:'Birbank', department:BIRBANK_DEPT, division:BIRBANK_DIV, section:BIRBANK_SEC_DEFAULT,           position:'Aparıcı mütəxəssis' },
  { name:'Tehranlı Ağaəli Cahid oğlu',          personalCode:'14365',   finCode:'7A796YP', company:'Birbank', department:BIRBANK_DEPT, division:BIRBANK_DIV, section:BIRBANK_SEC_DEFAULT,           position:'Aparıcı mütəxəssis' },
  { name:'Cavadlı Orxan Rauf oğlu',             personalCode:'15705',   finCode:'62RRL5A', company:'Birbank', department:BIRBANK_DEPT, division:BIRBANK_DIV, section:'Ecosystem talent performance', position:'Aparıcı mütəxəssis' },
  { name:'Cəlilov Hüseyn İlyas oğlu',           personalCode:'13525',   finCode:'5YJDECJ', company:'Birbank', department:BIRBANK_DEPT, division:BIRBANK_DIV, section:BIRBANK_SEC_DEFAULT,           position:'Aparıcı mütəxəssis' },
  { name:'Abasova Fəridə Ələddin qızı',         personalCode:'14793',   finCode:'6K3M526', company:'Birbank', department:BIRBANK_DEPT, division:BIRBANK_DIV, section:BIRBANK_SEC_DEFAULT,           position:'Aparıcı mütəxəssis' },
  { name:'Cəbrayılova Ülkər Vidadi qızı',       personalCode:'18200',   finCode:'7TS8T07', company:'Birbank', department:BIRBANK_DEPT, division:BIRBANK_DIV, section:BIRBANK_SEC_DEFAULT,           position:'Kiçik mütəxəssis (müvəqqəti)' },
  { name:'Kamılova Milana Babək qızı',          personalCode:'15764',   finCode:'7D9L5UC', company:'Birbank', department:BIRBANK_DEPT, division:BIRBANK_DIV, section:BIRBANK_SEC_DEFAULT,           position:'Mütəxəssis' },
  { name:'Namazova Zümrüd Bahadur qızı',        personalCode:'17972',   finCode:'7PC425S', company:'Birbank', department:BIRBANK_DEPT, division:BIRBANK_DIV, section:BIRBANK_SEC_DEFAULT,           position:'Kiçik mütəxəssis (müvəqqəti)' },
  { name:'Alzamanova Nərmin Sübhan qızı',       personalCode:'13442',   finCode:'6GMB923', company:'Birbank', department:BIRBANK_DEPT, division:BIRBANK_DIV, section:BIRBANK_SEC_DEFAULT,           position:'Mütəxəssis' },
  { name:'Yusifova Aysel Azər qızı',            personalCode:'16373',   finCode:'6J3GHRW', company:'Birbank', department:BIRBANK_DEPT, division:BIRBANK_DIV, section:BIRBANK_SEC_DEFAULT,           position:'Mütəxəssis' },
  // ── Pashapay ──
  { name:'Alıyeva Kamilə Əhəd qızı',           personalCode:'ID-55',   finCode:'17DBA60', company:'Pashapay', department:PASHAPAY_DEPT, division:PASHAPAY_DIV, section:'', position:'İR üzrə Baş Mütəxəssis' },
  { name:'Şahbazova İlahə İsa qızı',            personalCode:'ID-172',  finCode:'561FSQM', company:'Pashapay', department:PASHAPAY_DEPT, division:PASHAPAY_DIV, section:'', position:'İR Əməliyyatları üzrə Qrup Rəhbəri' },
  { name:'Məmmədova Fəridə Fariz qızı',         personalCode:'IDM-421', finCode:'874LKRL', company:'Pashapay', department:PASHAPAY_DEPT, division:PASHAPAY_DIV, section:'', position:'İR üzrə Mütəxəssis' },
  { name:'Kərimova Nərgiz Nəcəf qızı',          personalCode:'IDM-467', finCode:'4VKCLW4', company:'Pashapay', department:PASHAPAY_DEPT, division:PASHAPAY_DIV, section:'', position:'İR Əməliyyatları üzrə Menecer' },
  { name:'Hüseynova Mədinə Rövşən qızı',        personalCode:'IDM-884', finCode:'215FB6W', company:'Pashapay', department:PASHAPAY_DEPT, division:PASHAPAY_DIV, section:'', position:'İR üzrə Mütəxəssis' },
  // ── Birmarket ──
  { name:'Hacıyeva Aytən Sərkər qızı',          personalCode:'COM282',  finCode:'14G68KH', company:'Birmarket', department:BIRMARKET_DEPT, division:BIRMARKET_DIV, section:'', position:'İR əməliyyatları şöbəsinin rəhbəri' },
  { name:'Muradova Kamalə Yusif qızı',          personalCode:'COM528',  finCode:'5LU66PR', company:'Birmarket', department:BIRMARKET_DEPT, division:BIRMARKET_DIV, section:'', position:'İR üzrə mütəxəssis' },
  { name:'Abdullayeva Suğra Qabil qızı',        personalCode:'COM577',  finCode:'0X1YYNG', company:'Birmarket', department:BIRMARKET_DEPT, division:BIRMARKET_DIV, section:'', position:'İR üzrə baş mütəxəssis' },
  { name:'Nağıyeva Dərya ismixan qızı',         personalCode:'COM803',  finCode:'2L2GXHF', company:'Birmarket', department:BIRMARKET_DEPT, division:BIRMARKET_DIV, section:'', position:'İR üzrə mütəxəssis' },
  { name:'Nəfəsova Gülnar Siyasət qızı',        personalCode:'COM1603', finCode:'1E7FDPQ', company:'Birmarket', department:BIRMARKET_DEPT, division:BIRMARKET_DIV, section:'', position:'İR üzrə mütəxəssis' },
  { name:'Sunqarova Bikə Hacırabadan qızı',     personalCode:'COM1631', finCode:'62HAM7J', company:'Birmarket', department:BIRMARKET_DEPT, division:BIRMARKET_DIV, section:'', position:'İR üzrə mütəxəssis' },
  { name:'Həmzəyev Rüstəm Bayram oğlu',         personalCode:'COM1943', finCode:'4Z7X3GQ', company:'Birmarket', department:BIRMARKET_DEPT, division:BIRMARKET_DIV, section:'', position:'İR üzrə baş mütəxəssis' },
]

function firstName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/)
  return (parts[1] || parts[0] || '').toLowerCase()
}

async function main() {
  const snap = await db.collection('team').get()
  const existing = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  console.log(`Found ${existing.length} existing team members`)

  // Build first-name lookup for new members
  const newByFirstName = new Map()
  for (const m of NEW_MEMBERS) {
    newByFirstName.set(firstName(m.name), m)
  }

  const matched = new Map()
  const unmatchedExisting = []

  for (const ex of existing) {
    const fn = firstName(ex.name || '')
    if (newByFirstName.has(fn)) {
      matched.set(ex.id, { existing: ex, newData: newByFirstName.get(fn) })
      newByFirstName.delete(fn)
    } else {
      unmatchedExisting.push(ex)
    }
  }

  const toCreate = [...newByFirstName.values()]

  console.log(`\nMatched (update): ${matched.size}`)
  for (const [, { existing: ex, newData }] of matched) {
    console.log(`  "${ex.name}" → "${newData.name}"`)
  }
  console.log(`\nTo DELETE (${unmatchedExisting.length}):`)
  for (const ex of unmatchedExisting) console.log(`  "${ex.name}"`)
  console.log(`\nTo CREATE (${toCreate.length}):`)
  for (const m of toCreate) console.log(`  "${m.name}"`)

  // Build name remapping for tasks
  const nameMap = new Map()
  for (const [, { existing: ex, newData }] of matched) {
    if (ex.name !== newData.name) nameMap.set(ex.name, newData.name)
  }

  // Batch 1: update + delete
  const batch1 = db.batch()
  for (const [id, { newData }] of matched) {
    batch1.update(db.collection('team').doc(id), {
      name: newData.name,
      company: newData.company,
      department: newData.department,
      division: newData.division,
      section: newData.section,
      position: newData.position,
      personalCode: newData.personalCode,
      finCode: newData.finCode,
      role: newData.position,
      updatedAt: new Date().toISOString(),
    })
  }
  for (const ex of unmatchedExisting) {
    batch1.delete(db.collection('team').doc(ex.id))
  }
  await batch1.commit()
  console.log('\nBatch 1 (updates + deletes) committed')

  // Batch 2: create new
  if (toCreate.length > 0) {
    const wsId = existing[0]?.workspaceId || ''
    const batch2 = db.batch()
    for (const m of toCreate) {
      batch2.set(db.collection('team').doc(), {
        workspaceId: wsId,
        name: m.name,
        email: '',
        role: m.position,
        department: m.department,
        division: m.division,
        section: m.section,
        position: m.position,
        phone: '',
        avatar: '',
        personalCode: m.personalCode,
        finCode: m.finCode,
        company: m.company,
        createdAt: new Date().toISOString(),
      })
    }
    await batch2.commit()
    console.log(`Created ${toCreate.length} new members`)
  }

  // Batch 3: update tasks
  if (nameMap.size > 0) {
    console.log(`\nUpdating tasks for ${nameMap.size} name change(s)...`)
    const taskSnap = await db.collection('tasks').get()
    const batch3 = db.batch()
    let count = 0
    for (const doc of taskSnap.docs) {
      const assignee = doc.data().assignee
      if (assignee && nameMap.has(assignee)) {
        batch3.update(doc.ref, { assignee: nameMap.get(assignee) })
        count++
      }
    }
    await batch3.commit()
    console.log(`Updated ${count} task(s)`)
  }

  console.log('\nDone!')
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
