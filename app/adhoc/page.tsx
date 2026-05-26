'use client'

import { useState, useEffect, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'

/* ─── Types ──────────────────────────────────────────────────── */

type CheckItem = { text: string; done: boolean }
type Bullet    = { icon: string; text: string }

interface Section {
  id:       string
  tag:      string
  title:    string
  color:    string          // CSS color var name: 'primary' | 'success' | etc.
  stats?:   { value: string; label: string }[]
  items?:   CheckItem[]
  bullets?: Bullet[]
  note?:    string
  phases?:  { label: string; month: string; icon: string; color: string }[]
  saving?:  { value: string; note: string }
}

/* ─── Content ────────────────────────────────────────────────── */

const SECTIONS: Section[] = [
  {
    id: 'struktur',
    tag: '01',
    title: 'Ekosistem Struktur Dəyişiklikləri',
    color: 'indigo',
    stats: [
      { value: '~1 880', label: 'əməkdaş üçün struktur dəyişikliyi göndərildi' },
      { value: '158',    label: 'əməkdaş digər vertikallardan Recruitment ilə keçirildi' },
    ],
    bullets: [
      { icon: 'send',       text: 'Məlumatlar Orxan Cavadlı tərəfindən göndərilmişdir' },
      { icon: 'handshake',  text: 'Recruitment (xüsusən Nərgiz Əzimova) və HR Operations — yüksək koordinasiya ilə sürətli icra' },
      { icon: 'lock_person', text: 'Çətinlik: keçidləri reallaşmayan əməkdaşlar üzrə access verilə bilmir' },
    ],
  },
  {
    id: 'muqavile',
    tag: '02',
    title: 'Vahid Ekosistem Əmək Müqaviləsi',
    color: 'pink',
    items: [
      { done: true,  text: '5 günlük və 6 günlük əmək müqavilələri hazırlandı' },
      { done: true,  text: 'Birmarket növbəli çalışanlar üçün xüsusi şərtlər saxlanıldı' },
      { done: false, text: 'Növbəti aydan müqavilə dəyişikliyi mərhələli başlayır' },
      { done: false, text: 'Birmarket/Pashapay üçün 8-17, 10-19 və distant iş rejimi maddələri əlavə ediləcək' },
    ],
    note: 'Birmarket və Pashapay üzrə vahid əməkdaş təcrübəsinin əldə edilməsi hədəflənir',
  },
  {
    id: 'sop',
    tag: '03',
    title: 'Vahid SOP və Prosedurlar',
    color: 'info',
    items: [
      { done: true,  text: 'Məzuniyyət — razılaşdırıldı, SOP hazırlandı' },
      { done: true,  text: 'Ezamiyyət — razılaşdırıldı, SOP hazırlandı' },
      { done: true,  text: 'Xitam — razılaşdırıldı, SOP hazırlandı' },
      { done: true,  text: 'Miqrasiya — razılaşdırıldı, SOP hazırlandı' },
      { done: true,  text: 'Davamiyyət — razılaşdırıldı, SOP hazırlandı' },
      { done: false, text: 'Hüquqi və uyğunluq yoxlamalarından sonra tətbiq ediləcək' },
    ],
    note: '3 vertikal üzrə eyni qaydada standart proseslərin aparılmasını təmin edəcək',
  },
  {
    id: 'expat',
    tag: '04',
    title: 'Expat Miqrasiya Prosesləri',
    color: 'success',
    saving: {
      value: '~21 000 AZN / il',
      note: 'Pasha Travel ilə müqaviləyə xitam verildi — iki şirkət üzrə illik cost saving',
    },
    bullets: [
      { icon: 'swap_horiz',  text: 'Əvvəllər Pashapay/Birmarket bu proseslər üçün Pasha Travel-dən istifadə edirdi' },
      { icon: 'home_work',   text: 'Proses daxili icra edilə bildiyi üçün xarici şirkətə ehtiyac aradan qalxdı' },
    ],
  },
  {
    id: 'digital',
    tag: '05',
    title: 'Birmarket HR Dijitallaşdırma',
    color: 'warn',
    phases: [
      { label: 'Məzuniyyət',  month: 'İyun əvvəli',  icon: 'beach_access',   color: 'var(--primary)' },
      { label: 'İşdən çıxış', month: 'İyun ortası',  icon: 'exit_to_app',    color: 'var(--pink)' },
      { label: 'Ezamiyyət',   month: 'İyun sonu',    icon: 'flight_takeoff', color: 'var(--success)' },
    ],
    bullets: [
      { icon: 'flash_on', text: 'Microsoft Power Apps & Power Automate ilə elektron request formaları' },
      { icon: 'description', text: 'Fiziki kağız dövriyyəsinin azaldılması məqsədi' },
    ],
  },
  {
    id: 'mezuniyyet',
    tag: '06',
    title: 'Məzuniyyət Planlaması',
    color: 'accent',
    items: [
      { done: true,  text: '3 vertikal üzrə eyni yanaşma ilə paralel başladıldı' },
      { done: true,  text: 'Effektiv planlama üçün live datalar mövcuddur' },
      { done: false, text: 'Çətinlik: əməkdaşların Ekosistem keçidi zamanı yerlərini dəyişməsi' },
    ],
  },
  {
    id: 'hik',
    tag: '07',
    title: 'Pashapay Həmkarlar İttifaqı (HİK)',
    color: 'primary',
    items: [
      { done: true,  text: 'Hüquq departamenti ilə koordinasiyalı iş aparılır' },
      { done: true,  text: 'HİK-in təsis edilməsi üçün bütün hüquqi müraciətlər edilib' },
      { done: true,  text: 'Pashapay əməkdaşlarına kommunikasiyalar həyata keçirilib' },
      { done: false, text: 'HİK təsis edildikdən sonra Birbank kimi HİK benefitlərindən yararlanılacaq' },
      { done: false, text: 'Növbəti mərhələ: Birmarket əməkdaşlarının müstəqil HİK-ə qoşulması' },
    ],
  },
]

/* ─── Color helpers ──────────────────────────────────────────── */

const COLOR_VAR: Record<string, string> = {
  indigo:  'var(--primary)',
  pink:    'var(--pink)',
  info:    'var(--info)',
  success: 'var(--success)',
  warn:    'var(--warn)',
  accent:  'var(--accent)',
  primary: 'var(--primary)',
}
const COLOR_SOFT: Record<string, string> = {
  indigo:  'var(--primary-soft)',
  pink:    'var(--pink-soft)',
  info:    'var(--info-soft)',
  success: 'var(--success-soft)',
  warn:    'var(--warn-soft)',
  accent:  'var(--accent-soft)',
  primary: 'var(--primary-soft)',
}

/* ─── Sub-components ─────────────────────────────────────────── */

function SectionCard({ s }: { s: Section }) {
  const cv   = COLOR_VAR[s.color]  || 'var(--primary)'
  const soft = COLOR_SOFT[s.color] || 'var(--primary-soft)'

  const doneCount  = s.items?.filter(x => x.done).length ?? 0
  const totalCount = s.items?.length ?? 0
  const pct        = totalCount ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    <div className="cardM" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '3px 9px', borderRadius: 999,
          background: soft, color: cv,
          border: `1px solid color-mix(in srgb, ${cv} 25%, transparent)`,
          flexShrink: 0,
        }}>{s.tag}</span>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          {s.title}
        </h3>
        {totalCount > 0 && (
          <span style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 800,
            color: cv, flexShrink: 0,
          }}>{pct}%</span>
        )}
      </div>

      {/* Stats */}
      {s.stats && s.stats.length > 0 && (
        <div style={{ display: 'flex', gap: 10 }}>
          {s.stats.map((st, i) => (
            <div key={i} style={{
              flex: 1, padding: '12px 14px', borderRadius: 12,
              background: soft, border: `1px solid color-mix(in srgb, ${cv} 20%, transparent)`,
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: cv, letterSpacing: '-0.03em', lineHeight: 1 }}>{st.value}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontWeight: 600, lineHeight: 1.4 }}>{st.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Saving */}
      {s.saving && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', borderRadius: 12,
          background: soft, border: `1px solid color-mix(in srgb, ${cv} 20%, transparent)`,
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: 22, color: cv, flexShrink: 0 }}>savings</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: cv, letterSpacing: '-0.02em' }}>{s.saving.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontWeight: 600 }}>{s.saving.note}</div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {totalCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: pct + '%', background: cv, borderRadius: 999, transition: 'width 1s' }} />
          </div>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {doneCount}/{totalCount}
          </span>
        </div>
      )}

      {/* Checklist */}
      {s.items && s.items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {s.items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 9,
              fontSize: 12, lineHeight: 1.45,
              color: item.done ? 'var(--ink-2)' : 'var(--muted)',
            }}>
              <span className="material-symbols-rounded" style={{
                fontSize: 16, flexShrink: 0, marginTop: 1,
                color: item.done ? cv : (item.text.startsWith('Çətinlik') ? 'var(--warn)' : 'var(--muted-2)'),
              }}>
                {item.done ? 'check_circle' : (item.text.startsWith('Çətinlik') ? 'warning' : 'radio_button_unchecked')}
              </span>
              <span style={{ textDecoration: 'none', fontWeight: item.done ? 600 : 500 }}>{item.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bullets */}
      {s.bullets && s.bullets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {s.bullets.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.45 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 15, color: cv, flexShrink: 0, marginTop: 1 }}>{b.icon}</span>
              <span style={{ fontWeight: 500 }}>{b.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Timeline (phases) */}
      {s.phases && s.phases.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, position: 'relative', marginTop: 4 }}>
          {s.phases.map((ph, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {i < s.phases!.length - 1 && (
                <div style={{ position: 'absolute', top: 18, left: '50%', right: '-50%', height: 2, background: `linear-gradient(90deg, ${ph.color}, ${s.phases![i+1].color})`, opacity: 0.4 }} />
              )}
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                border: `2px solid ${ph.color}`, background: 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: 17, color: ph.color }}>{ph.icon}</span>
              </div>
              <div style={{ marginTop: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: ph.color }}>{ph.label}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, fontWeight: 600 }}>{ph.month}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note */}
      {s.note && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 12px',
          borderRadius: 10, background: soft,
          borderLeft: `3px solid ${cv}`,
          fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.5, fontWeight: 600,
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: 14, color: cv, flexShrink: 0, marginTop: 1 }}>info</span>
          {s.note}
        </div>
      )}
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────────── */

export default function AdhocPage() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const outerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await outerRef.current?.requestFullscreen()
  }

  return (
    <div ref={outerRef} className="pageM fade-in" style={isFullscreen ? { background: 'var(--bg)', padding: 24, overflowY: 'auto', height: '100vh' } : {}}>

      {/* Header */}
      <div className="team-headM" style={{ marginBottom: 16 }}>
        <div>
          <h1>Ad hoc — Townhall Təqdimatı</h1>
          <div className="sub">İnsan Resursları üzrə Ekosistem layihələri · {SECTIONS.length} layihə</div>
        </div>
        <button className="btn-ghostM" onClick={toggleFullscreen}>
          <Icon name={isFullscreen ? 'fullscreen_exit' : 'fullscreen'} size={15} />
          {isFullscreen ? 'Çıx' : 'Tam ekran'}
        </button>
      </div>

      {/* Grid: 2 columns, dense */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: 14,
        alignItems: 'start',
      }}>
        {SECTIONS.map(s => <SectionCard key={s.id} s={s} />)}
      </div>
    </div>
  )
}
