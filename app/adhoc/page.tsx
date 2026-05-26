'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Icon } from '@/components/ui/Icon'

/* ─── Slide data ─────────────────────────────────────────────── */

const SLIDES = [
  {
    id: 'hero',
    type: 'hero' as const,
  },
  {
    id: 'struktur',
    type: 'stat' as const,
    tag: '01',
    title: 'Ekosistem Struktur Dəyişiklikləri',
    accent: '#5B5BF5',
    accentSoft: 'rgba(91,91,245,0.12)',
    stats: [
      { value: 1880, suffix: '', label: 'əməkdaş üçün struktur dəyişikliyi', icon: 'group', color: '#5B5BF5' },
      { value: 158,  suffix: '', label: 'əməkdaş digər vertikallardan keçirildi', icon: 'transfer_within_a_station', color: '#16C098' },
    ],
    bullets: [
      { icon: 'send', text: 'Məlumatlar Orxan Cavadlı tərəfindən göndərilmişdir' },
      { icon: 'groups', text: 'Recruitment (xüsusən Nərgiz Əzimova) və HR Operations komandaları yüksək koordinasiya ilə işləmişdir' },
      { icon: 'warning', text: 'Keçidləri reallaşmayan əməkdaşlar üzrə access verilməməsi hazırda əsas çətinlikdir' },
    ],
  },
  {
    id: 'muqavile',
    type: 'project' as const,
    tag: '02',
    title: 'Vahid Əmək Ekosistem Müqaviləsi',
    accent: '#E879C8',
    accentSoft: 'rgba(232,121,200,0.12)',
    subtitle: 'Birmarket və Pashapay vertikallarının Birbankın əmək müqaviləsinə uyğunlaşdırılması',
    items: [
      { icon: 'check_circle', done: true,  text: '5 günlük və 6 günlük əmək müqavilələri hazırlanıb' },
      { icon: 'check_circle', done: true,  text: 'Növbəli çalışan Birmarket əməkdaşları üçün xüsusi şərtlər saxlanılır' },
      { icon: 'schedule',     done: false, text: 'Növbəti aydan müqavilə dəyişikliyi mərhələli başlayır' },
      { icon: 'schedule',     done: false, text: 'Birmarket/Pashapay üçün 8-17, 10-19 və distant iş rejimi maddələri əlavə ediləcək' },
    ],
  },
  {
    id: 'sop',
    type: 'project' as const,
    tag: '03',
    title: 'Vahid SOP və Prosedurlar',
    accent: '#4DABF7',
    accentSoft: 'rgba(77,171,247,0.12)',
    subtitle: 'İnsan Resursları üzrə Ekosistem daxilində vahid standartların tətbiqi',
    items: [
      { icon: 'check_circle', done: true,  text: 'Məzuniyyət proseduru razılaşdırıldı və SOP hazırlandı' },
      { icon: 'check_circle', done: true,  text: 'Ezamiyyət proseduru razılaşdırıldı və SOP hazırlandı' },
      { icon: 'check_circle', done: true,  text: 'Xitam proseduru razılaşdırıldı və SOP hazırlandı' },
      { icon: 'check_circle', done: true,  text: 'Miqrasiya proseduru razılaşdırıldı və SOP hazırlandı' },
      { icon: 'check_circle', done: true,  text: 'Davamiyyət proseduru razılaşdırıldı və SOP hazırlandı' },
      { icon: 'schedule',     done: false, text: 'Hüquqi və uyğunluq yoxlamalarından sonra tətbiq ediləcək' },
    ],
    note: '3 vertikal üzrə eyni qaydada standart proseslərin icrasını təmin edəcək',
  },
  {
    id: 'expat',
    type: 'saving' as const,
    tag: '04',
    title: 'Expat Miqrasiya Prosesləri',
    accent: '#16C098',
    accentSoft: 'rgba(22,192,152,0.12)',
    subtitle: 'Pashapay və Birmarket üzrə miqrasiya proseslərinin Birbank standartlarına uyğunlaşdırılması',
    saving: 21000,
    savingLabel: 'AZN / il',
    savingNote: 'Pasha Travel ilə müqaviləyə xitam verildi — iki şirkət üzrə cost saving',
    bullets: [
      { icon: 'swap_horiz',   text: 'Əvvəllər Pashapay və Birmarket bu proseslər üçün Pasha Travel-dən istifadə edirdi' },
      { icon: 'home_work',    text: 'Proses daxili icra edilə bildiyi üçün xarici şirkətə ehtiyac aradan qalxdı' },
      { icon: 'savings',      text: 'Müqaviləyə xitam verildi, iki şirkət üzrə illik ~21.000 AZN qənaət' },
    ],
  },
  {
    id: 'digital',
    type: 'timeline' as const,
    tag: '05',
    title: 'Birmarket HR Dijitallaşdırma',
    accent: '#F5A524',
    accentSoft: 'rgba(245,165,36,0.12)',
    subtitle: 'Fiziki kağız dövriyyəsini azaltmaq — Microsoft Power Apps & Power Automate',
    phases: [
      { month: 'İyun əvvəli',  label: 'Məzuniyyət',     icon: 'beach_access',    done: false, color: '#5B5BF5' },
      { month: 'İyun ortası',  label: 'İşdən çıxış',    icon: 'exit_to_app',     done: false, color: '#E879C8' },
      { month: 'İyun sonu',    label: 'Ezamiyyət',      icon: 'flight_takeoff',  done: false, color: '#16C098' },
    ],
  },
  {
    id: 'mezuniyyet',
    type: 'project' as const,
    tag: '06',
    title: 'Məzuniyyət Planlama Layihəsi',
    accent: '#7C5BF7',
    accentSoft: 'rgba(124,91,247,0.12)',
    subtitle: '3 vertikal üzrə eyni yanaşma ilə paralel məzuniyyət planlaması',
    items: [
      { icon: 'check_circle', done: true,  text: '3 vertikal üzrə eyni yanaşma ilə paralel başladıldı' },
      { icon: 'check_circle', done: true,  text: 'Planlamanın effektiv aparılması üçün live datalar mövcuddur' },
      { icon: 'warning',      done: false, text: 'Çətinlik: Ekosistem struktur dəyişiklikləri ilə əməkdaşların yerlərini dəyişməsi' },
    ],
  },
  {
    id: 'hik',
    type: 'project' as const,
    tag: '07',
    title: 'Pashapay Həmkarlar İttifaqı',
    accent: '#FF6A6A',
    accentSoft: 'rgba(255,106,106,0.12)',
    subtitle: 'Pashapay əməkdaşlarının müstəqil HİK layihəsi',
    items: [
      { icon: 'check_circle', done: true,  text: 'Hüquq departamenti ilə koordinasiyalı işlənilir' },
      { icon: 'check_circle', done: true,  text: 'HİK-in təsis edilməsi üçün bütün hüquqi müraciətlər edilib' },
      { icon: 'check_circle', done: true,  text: 'Pashapay əməkdaşlarına kommunikasiyalar həyata keçirilib' },
      { icon: 'schedule',     done: false, text: 'HİK təsis edildikdən sonra Birbank kimi HİK benefitlərindən yararlanılacaq' },
      { icon: 'schedule',     done: false, text: 'Növbəti mərhələ: Birmarket əməkdaşlarının müstəqil HİK-ə qoşulması' },
    ],
  },
]

/* ─── Counter animation ──────────────────────────────────────── */

function AnimatedNumber({ target, duration = 1800 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(ease * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])

  return <>{val.toLocaleString('az-AZ')}</>
}

/* ─── Slide components ───────────────────────────────────────── */

function HeroSlide() {
  return (
    <div className="ah-hero">
      <div className="ah-hero-bg">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="ah-blob" style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>
      <div className="ah-hero-content">
        <div className="ah-hero-eyebrow">
          <span className="ah-tag-pill">Townhall Təqdimatı</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>2025</span>
        </div>
        <h1 className="ah-hero-title">
          Ekosistem HR<br />
          <span className="ah-gradient-text">Layihələri</span>
        </h1>
        <p className="ah-hero-sub">
          İnsan Resursları üzrə Ekosistem daxilində aparılan<br />
          əsas layihələr və nailiyyətlər
        </p>
        <div className="ah-hero-stats">
          {[
            { n: 1880, label: 'əməkdaş',      icon: 'group' },
            { n: 158,  label: 'yeni keçid',    icon: 'transfer_within_a_station' },
            { n: 7,    label: 'aktiv layihə',  icon: 'rocket_launch' },
            { n: 21000,label: 'AZN qənaət',   icon: 'savings' },
          ].map((s, i) => (
            <div key={i} className="ah-hero-kpi">
              <span className="material-symbols-rounded" style={{ fontSize: 20, opacity: 0.7 }}>{s.icon}</span>
              <div className="ah-kpi-num">
                <AnimatedNumber target={s.n} duration={1600 + i * 200} />
              </div>
              <div className="ah-kpi-lbl">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="ah-hero-hint">
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>swipe_right</span>
          Növbəti slayda keçin
        </div>
      </div>
    </div>
  )
}

function StatSlide({ slide }: { slide: typeof SLIDES[number] & { type: 'stat' } }) {
  return (
    <div className="ah-slide" style={{ '--accent': slide.accent, '--accent-soft': slide.accentSoft } as React.CSSProperties}>
      <div className="ah-slide-tag">{slide.tag}</div>
      <h2 className="ah-slide-title">{slide.title}</h2>

      <div className="ah-stat-row">
        {slide.stats.map((s, i) => (
          <div key={i} className="ah-big-stat" style={{ borderColor: s.color + '33' }}>
            <div className="ah-big-stat-num" style={{ color: s.color }}>
              <AnimatedNumber target={s.value} duration={1400 + i * 300} />
            </div>
            <div className="ah-big-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="ah-bullets">
        {slide.bullets.map((b, i) => (
          <div key={i} className="ah-bullet" style={{ animationDelay: i * 0.12 + 's' }}>
            <span className="ah-bullet-ico" style={{ background: slide.accentSoft, color: slide.accent }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>{b.icon}</span>
            </span>
            <span>{b.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProjectSlide({ slide }: { slide: typeof SLIDES[number] & { type: 'project' } }) {
  const done  = slide.items.filter(x => x.done).length
  const total = slide.items.length
  const pct   = Math.round((done / total) * 100)

  return (
    <div className="ah-slide" style={{ '--accent': slide.accent, '--accent-soft': slide.accentSoft } as React.CSSProperties}>
      <div className="ah-slide-tag">{slide.tag}</div>
      <h2 className="ah-slide-title">{slide.title}</h2>
      <p className="ah-slide-sub">{slide.subtitle}</p>

      <div className="ah-progress-bar-wrap">
        <div className="ah-progress-bar">
          <div className="ah-progress-fill" style={{ width: pct + '%', background: slide.accent }} />
        </div>
        <span className="ah-progress-pct" style={{ color: slide.accent }}>{pct}%</span>
        <span className="ah-progress-label">{done}/{total} tamamlandı</span>
      </div>

      <div className="ah-checklist">
        {slide.items.map((item, i) => (
          <div key={i} className={'ah-check-item' + (item.done ? ' done' : '')} style={{ animationDelay: i * 0.09 + 's' }}>
            <span className="ah-check-ico" style={{ color: item.done ? slide.accent : (item.icon === 'warning' ? 'var(--warn)' : 'var(--muted-2)') }}>
              <span className="material-symbols-rounded" style={{ fontSize: 20 }}>{item.icon}</span>
            </span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>

      {'note' in slide && slide.note && (
        <div className="ah-note" style={{ borderColor: slide.accent + '44', color: slide.accent }}>
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>info</span>
          {slide.note}
        </div>
      )}
    </div>
  )
}

function SavingSlide({ slide }: { slide: typeof SLIDES[number] & { type: 'saving' } }) {
  return (
    <div className="ah-slide" style={{ '--accent': slide.accent, '--accent-soft': slide.accentSoft } as React.CSSProperties}>
      <div className="ah-slide-tag">{slide.tag}</div>
      <h2 className="ah-slide-title">{slide.title}</h2>
      <p className="ah-slide-sub">{slide.subtitle}</p>

      <div className="ah-saving-card" style={{ borderColor: slide.accent + '44', background: slide.accentSoft }}>
        <div className="ah-saving-ico" style={{ color: slide.accent }}>
          <span className="material-symbols-rounded" style={{ fontSize: 40 }}>savings</span>
        </div>
        <div>
          <div className="ah-saving-num" style={{ color: slide.accent }}>
            ~<AnimatedNumber target={slide.saving} />
          </div>
          <div className="ah-saving-unit">{slide.savingLabel}</div>
          <div className="ah-saving-note">{slide.savingNote}</div>
        </div>
      </div>

      <div className="ah-bullets">
        {slide.bullets.map((b, i) => (
          <div key={i} className="ah-bullet" style={{ animationDelay: i * 0.12 + 's' }}>
            <span className="ah-bullet-ico" style={{ background: slide.accentSoft, color: slide.accent }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>{b.icon}</span>
            </span>
            <span>{b.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TimelineSlide({ slide }: { slide: typeof SLIDES[number] & { type: 'timeline' } }) {
  return (
    <div className="ah-slide" style={{ '--accent': slide.accent, '--accent-soft': slide.accentSoft } as React.CSSProperties}>
      <div className="ah-slide-tag">{slide.tag}</div>
      <h2 className="ah-slide-title">{slide.title}</h2>
      <p className="ah-slide-sub">{slide.subtitle}</p>

      <div className="ah-timeline">
        {slide.phases.map((ph, i) => (
          <div key={i} className="ah-tl-item" style={{ animationDelay: i * 0.15 + 's' }}>
            <div className="ah-tl-node" style={{ borderColor: ph.color, background: ph.done ? ph.color : 'var(--surface)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 22, color: ph.done ? 'white' : ph.color }}>{ph.icon}</span>
            </div>
            {i < slide.phases.length - 1 && (
              <div className="ah-tl-line" style={{ background: `linear-gradient(90deg, ${ph.color}, ${slide.phases[i+1].color})` }} />
            )}
            <div className="ah-tl-body">
              <div className="ah-tl-label" style={{ color: ph.color }}>{ph.label}</div>
              <div className="ah-tl-month">{ph.month}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="ah-tech-badge">
        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>flash_on</span>
        Microsoft Power Apps &amp; Power Automate
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────────── */

export default function AdhocPage() {
  const [current, setCurrent] = useState(0)
  const [dir, setDir] = useState<'next' | 'prev'>('next')
  const [animKey, setAnimKey] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const outerRef = useRef<HTMLDivElement>(null)
  const total = SLIDES.length

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await outerRef.current?.requestFullscreen()
  }

  const go = useCallback((idx: number) => {
    const d = idx > current ? 'next' : 'prev'
    setDir(d)
    setAnimKey(k => k + 1)
    setCurrent(Math.max(0, Math.min(total - 1, idx)))
  }, [current, total])

  const next = () => go(current + 1)
  const prev = () => go(current - 1)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); next() }
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')                    { e.preventDefault(); prev() }
      if (e.key === 'f' || e.key === 'F')                                    toggleFullscreen()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  const slide = SLIDES[current]

  return (
    <>
      <style>{`
        .ah-wrap {
          display: flex; flex-direction: column;
          height: calc(100vh - 40px);
          min-height: 520px;
          background: #0A0B1A;
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          margin: -4px;
          color: #fff;
        }
        .ah-wrap:fullscreen { border-radius: 0; height: 100vh; margin: 0; }

        /* Hero */
        .ah-hero { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
        .ah-hero-bg { position: absolute; inset: 0; overflow: hidden; }
        .ah-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
          animation: blobFloat 8s ease-in-out infinite;
          animation-delay: calc(var(--i) * 1.4s);
        }
        .ah-blob:nth-child(1) { width: 400px; height: 400px; background: #5B5BF5; top: -100px; left: -80px; }
        .ah-blob:nth-child(2) { width: 300px; height: 300px; background: #E879C8; top: 40%;  right: -60px; }
        .ah-blob:nth-child(3) { width: 350px; height: 350px; background: #16C098; bottom: -80px; left: 30%; }
        .ah-blob:nth-child(4) { width: 200px; height: 200px; background: #4DABF7; top: 20%;  left: 50%; }
        .ah-blob:nth-child(5) { width: 250px; height: 250px; background: #F5A524; bottom: 10%; right: 20%; }
        .ah-blob:nth-child(6) { width: 180px; height: 180px; background: #FF6A6A; top: 60%;  left: 10%; }
        @keyframes blobFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(20px, -20px) scale(1.1); }
        }
        .ah-hero-content { position: relative; z-index: 1; text-align: center; padding: 32px 24px; }
        .ah-hero-eyebrow { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px; }
        .ah-tag-pill {
          padding: 5px 14px; border-radius: 999px; font-size: 12px; font-weight: 700;
          background: rgba(91,91,245,0.25); border: 1px solid rgba(91,91,245,0.5); color: #A0A0FF;
          letter-spacing: 0.05em; text-transform: uppercase;
        }
        .ah-hero-title { font-size: clamp(40px, 6vw, 80px); font-weight: 900; letter-spacing: -0.03em; line-height: 1.05; margin: 0 0 16px; color: #fff; }
        .ah-gradient-text { background: linear-gradient(90deg, #5B5BF5, #E879C8, #F5A524); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .ah-hero-sub { font-size: clamp(14px, 1.8vw, 18px); color: rgba(255,255,255,0.55); line-height: 1.6; margin: 0 0 36px; }
        .ah-hero-stats { display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; margin-bottom: 36px; }
        .ah-hero-kpi { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px 24px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; min-width: 120px; }
        .ah-kpi-num { font-size: clamp(24px, 3.5vw, 42px); font-weight: 900; color: #fff; letter-spacing: -0.03em; line-height: 1; }
        .ah-kpi-lbl { font-size: 11px; color: rgba(255,255,255,0.45); font-weight: 600; text-align: center; }
        .ah-hero-hint { display: flex; align-items: center; gap: 6px; justify-content: center; font-size: 12px; color: rgba(255,255,255,0.3); animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.7; } }

        /* Generic slide */
        .ah-slide {
          flex: 1; padding: clamp(28px, 4vw, 56px) clamp(28px, 5vw, 72px);
          display: flex; flex-direction: column; gap: 20px;
          animation: slideIn .42s cubic-bezier(.2,.7,.1,1);
          overflow-y: auto;
        }
        @keyframes slideIn { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        .ah-slide-tag {
          font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--accent); background: var(--accent-soft);
          padding: 4px 12px; border-radius: 999px; align-self: flex-start;
          border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
        }
        .ah-slide-title { font-size: clamp(22px, 3.2vw, 42px); font-weight: 900; letter-spacing: -0.025em; line-height: 1.15; margin: 0; color: #fff; }
        .ah-slide-sub { font-size: clamp(13px, 1.6vw, 16px); color: rgba(255,255,255,0.5); line-height: 1.6; margin: 0; }

        /* Stat slide */
        .ah-stat-row { display: flex; gap: 20px; flex-wrap: wrap; }
        .ah-big-stat { flex: 1; min-width: 200px; padding: 24px 28px; border-radius: 20px; border: 1px solid; background: rgba(255,255,255,0.04); }
        .ah-big-stat-num { font-size: clamp(40px, 5.5vw, 72px); font-weight: 900; letter-spacing: -0.04em; line-height: 1; }
        .ah-big-stat-lbl { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 8px; font-weight: 600; }

        /* Bullets */
        .ah-bullets { display: flex; flex-direction: column; gap: 12px; }
        .ah-bullet { display: flex; align-items: flex-start; gap: 14px; font-size: clamp(13px, 1.5vw, 15px); color: rgba(255,255,255,0.8); line-height: 1.5; animation: fadeUp .4s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .ah-bullet-ico { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        /* Progress bar */
        .ah-progress-bar-wrap { display: flex; align-items: center; gap: 12px; }
        .ah-progress-bar { flex: 1; height: 8px; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden; }
        .ah-progress-fill { height: 100%; border-radius: 999px; transition: width 1.2s cubic-bezier(.2,.7,.1,1); }
        .ah-progress-pct { font-size: 18px; font-weight: 800; }
        .ah-progress-label { font-size: 12px; color: rgba(255,255,255,0.4); font-weight: 600; }

        /* Checklist */
        .ah-checklist { display: flex; flex-direction: column; gap: 10px; }
        .ah-check-item { display: flex; align-items: flex-start; gap: 12px; font-size: clamp(13px, 1.4vw, 15px); color: rgba(255,255,255,0.65); animation: fadeUp .35s ease both; padding: 10px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
        .ah-check-item.done { color: rgba(255,255,255,0.85); }
        .ah-check-ico { flex-shrink: 0; margin-top: 1px; }

        /* Note */
        .ah-note { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; padding: 12px 16px; border-radius: 12px; border-left: 3px solid; background: rgba(255,255,255,0.03); }

        /* Saving */
        .ah-saving-card { display: flex; align-items: center; gap: 28px; padding: 28px 32px; border-radius: 24px; border: 1px solid; margin-bottom: 8px; }
        .ah-saving-num { font-size: clamp(40px, 5vw, 64px); font-weight: 900; letter-spacing: -0.04em; line-height: 1; }
        .ah-saving-unit { font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 700; margin-top: 4px; }
        .ah-saving-note { font-size: 13px; color: rgba(255,255,255,0.4); margin-top: 8px; }

        /* Timeline */
        .ah-timeline { display: flex; align-items: flex-start; gap: 0; margin: 16px 0; position: relative; }
        .ah-tl-item { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; animation: fadeUp .4s ease both; }
        .ah-tl-node { width: 72px; height: 72px; border-radius: 50%; border: 3px solid; display: flex; align-items: center; justify-content: center; background: var(--surface); z-index: 1; }
        .ah-tl-line { position: absolute; top: 35px; left: calc(50% + 36px); right: calc(-50% + 36px); height: 3px; z-index: 0; }
        .ah-tl-body { margin-top: 14px; text-align: center; }
        .ah-tl-label { font-size: 15px; font-weight: 800; margin-bottom: 4px; }
        .ah-tl-month { font-size: 12px; color: rgba(255,255,255,0.45); font-weight: 600; }
        .ah-tech-badge { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.7); align-self: flex-start; }

        /* Nav bar */
        .ah-nav { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-top: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.02); flex-shrink: 0; }
        .ah-nav-btn { display: flex; align-items: center; gap: 6px; padding: 9px 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); font-size: 13px; font-weight: 700; cursor: pointer; transition: all .15s; font-family: inherit; }
        .ah-nav-btn:hover:not(:disabled) { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.2); }
        .ah-nav-btn:disabled { opacity: 0.25; cursor: not-allowed; }
        .ah-nav-btn.primary { background: #5B5BF5; border-color: #5B5BF5; color: #fff; }
        .ah-nav-btn.primary:hover { background: #4a4adf; }
        .ah-dots { display: flex; gap: 7px; align-items: center; }
        .ah-dot { width: 8px; height: 8px; border-radius: 999px; background: rgba(255,255,255,0.18); cursor: pointer; transition: all .2s; border: none; padding: 0; }
        .ah-dot.active { width: 24px; background: #5B5BF5; }
        .ah-dot:hover:not(.active) { background: rgba(255,255,255,0.35); }
        .ah-fs-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.45); font-size: 12px; cursor: pointer; transition: all .15s; font-family: inherit; }
        .ah-fs-btn:hover { color: rgba(255,255,255,0.8); border-color: rgba(255,255,255,0.2); }
        .ah-counter { font-size: 12px; color: rgba(255,255,255,0.3); font-weight: 700; font-variant-numeric: tabular-nums; }
      `}</style>

      <div ref={outerRef} className="ah-wrap">
        {/* Slide area */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {(() => {
            const s = SLIDES[current]
            const key = `${current}-${animKey}`
            if (s.type === 'hero')     return <HeroSlide key={key} />
            if (s.type === 'stat')     return <StatSlide key={key} slide={s as typeof SLIDES[number] & { type: 'stat' }} />
            if (s.type === 'project')  return <ProjectSlide key={key} slide={s as typeof SLIDES[number] & { type: 'project' }} />
            if (s.type === 'saving')   return <SavingSlide key={key} slide={s as typeof SLIDES[number] & { type: 'saving' }} />
            if (s.type === 'timeline') return <TimelineSlide key={key} slide={s as typeof SLIDES[number] & { type: 'timeline' }} />
          })()}
        </div>

        {/* Navigation */}
        <div className="ah-nav">
          <button className="ah-nav-btn" onClick={prev} disabled={current === 0}>
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>arrow_back</span>
            Əvvəlki
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div className="ah-dots">
              {SLIDES.map((_, i) => (
                <button key={i} className={'ah-dot' + (i === current ? ' active' : '')} onClick={() => go(i)} />
              ))}
            </div>
            <span className="ah-counter">{current + 1} / {total}</span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ah-fs-btn" onClick={toggleFullscreen} title="F — tam ekran">
              <span className="material-symbols-rounded" style={{ fontSize: 15 }}>
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
              {isFullscreen ? 'Çıx' : 'Tam ekran'}
            </button>
            <button className={'ah-nav-btn' + (current === total - 1 ? '' : ' primary')} onClick={next} disabled={current === total - 1}>
              Növbəti
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
