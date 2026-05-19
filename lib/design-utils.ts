const PASTEL_PALETTES: [string, string][] = [
  ['#FFD6E0', '#FFC9B0'],
  ['#C5F5E0', '#BFE6FF'],
  ['#E5DCFF', '#FFD6E0'],
  ['#FFF0B8', '#FFD9B0'],
  ['#F0D5FF', '#C5F5E0'],
  ['#C9E6FF', '#DCD3FF'],
  ['#FFCABA', '#FFF0B8'],
  ['#D8EFC8', '#C9E6FF'],
]

const VIBRANT_PALETTES: [string, string][] = [
  ['#5B5BF5', '#B57BFF'],
  ['#FF8B7B', '#FFD466'],
  ['#16C098', '#67E8C5'],
  ['#4DABF7', '#A78BFA'],
  ['#E879C8', '#FF8FB1'],
  ['#F5A524', '#FF8B7B'],
  ['#7C5BF7', '#E879C8'],
  ['#16C098', '#5B5BF5'],
]

function paletteIndexFor(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return Math.abs(h) % 8
}

export function paletteFor(seed: string): [string, string] {
  return PASTEL_PALETTES[paletteIndexFor(seed)]
}

export function avatarPaletteFor(seed: string): [string, string] {
  return VIBRANT_PALETTES[(paletteIndexFor(seed) + 3) % 8]
}

export function initialsM(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export function fmtDateM(iso: string | undefined | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtTimeM(iso: string | undefined | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
}

export const STATUS_COLORS: Record<string, string> = {
  'Davam edir':     'indigo',
  'Tamamlandı':     'green',
  'Yoxlanılır':     'warn',
  'Planlaşdırılır': 'muted',
  'Gözləyir':       'warn',
  'Dayandırıldı':   'accent',
}

export function daysFromNow(iso: string | undefined | null): number {
  if (!iso) return 0
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

export function relTimeAz(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 60) return 'indi'
  const min = Math.floor(sec / 60)
  if (min < 60) return min + ' dəq əvvəl'
  const hr = Math.floor(min / 60)
  if (hr < 24) return hr + ' saat əvvəl'
  const day = Math.floor(hr / 24)
  if (day < 7) return day + ' gün əvvəl'
  const d = new Date(iso)
  return d.getDate() + ' ' + ['Yan','Fev','Mar','Apr','May','İyn','İyl','Avq','Sen','Okt','Noy','Dek'][d.getMonth()]
}
