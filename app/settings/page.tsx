'use client'

import { useState } from 'react'
import { sheetsApi } from '@/lib/sheets'
import { Settings, Database, ExternalLink, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [initializing, setInitializing] = useState(false)
  const [tested, setTested] = useState<boolean | null>(null)
  const [testing, setTesting] = useState(false)

  const scriptUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL
  const sheetUrl = process.env.NEXT_PUBLIC_SHEET_URL

  const handleInit = async () => {
    setInitializing(true)
    const res = await sheetsApi.setup.init()
    if (res.success) toast.success('Google Sheets uğurla inisializasiya edildi!')
    else toast.error(res.error || 'Xəta baş verdi')
    setInitializing(false)
  }

  const handleTest = async () => {
    setTesting(true)
    setTested(null)
    const res = await sheetsApi.projects.getAll()
    setTested(res.success)
    if (res.success) toast.success('Əlaqə uğurla yoxlandı!')
    else toast.error('Əlaqə qurula bilmədi: ' + res.error)
    setTesting(false)
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="page-title">Parametrlər</h1>
        <p className="text-text-secondary text-sm mt-1">Platforma konfiqurasiyası</p>
      </div>

      {/* Connection Status */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <Database size={18} className="text-accent-blue" />
          Google Sheets Əlaqəsi
        </h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div>
              <div className="text-text-primary text-sm font-medium">Apps Script URL</div>
              <div className="text-text-muted text-xs mt-0.5">
                {scriptUrl ? (
                  <span className="text-accent-green flex items-center gap-1">
                    <CheckCircle size={11} /> Konfiqurasiya edilib
                  </span>
                ) : (
                  <span className="text-accent-red flex items-center gap-1">
                    <AlertCircle size={11} /> .env.local faylında NEXT_PUBLIC_APPS_SCRIPT_URL lazımdır
                  </span>
                )}
              </div>
            </div>
            {scriptUrl && (
              <a href={scriptUrl} target="_blank" rel="noopener noreferrer"
                className="text-accent-blue hover:text-blue-400 transition-colors">
                <ExternalLink size={15} />
              </a>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div>
              <div className="text-text-primary text-sm font-medium">Google Sheets URL</div>
              <div className="text-text-muted text-xs mt-0.5">
                {sheetUrl ? (
                  <span className="text-accent-green flex items-center gap-1">
                    <CheckCircle size={11} /> Konfiqurasiya edilib
                  </span>
                ) : (
                  <span className="text-text-muted">NEXT_PUBLIC_SHEET_URL (ixtiyari)</span>
                )}
              </div>
            </div>
            {sheetUrl && (
              <a href={sheetUrl} target="_blank" rel="noopener noreferrer"
                className="text-accent-blue hover:text-blue-400 transition-colors">
                <ExternalLink size={15} />
              </a>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleTest} disabled={testing || !scriptUrl} className="btn-secondary flex-1 justify-center disabled:opacity-40">
            <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
            {testing ? 'Yoxlanılır...' : 'Əlaqəni yoxla'}
          </button>
          <button onClick={handleInit} disabled={initializing || !scriptUrl} className="btn-primary flex-1 justify-center disabled:opacity-40">
            <Database size={14} className={initializing ? 'animate-pulse' : ''} />
            {initializing ? 'İnisializasiya...' : 'Sheet-i inisializasiya et'}
          </button>
        </div>

        {tested !== null && (
          <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${tested ? 'bg-accent-green/10 text-accent-green border border-accent-green/20' : 'bg-accent-red/10 text-accent-red border border-accent-red/20'}`}>
            {tested ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {tested ? 'Əlaqə uğurla quruldu' : 'Əlaqə qurula bilmədi'}
          </div>
        )}
      </div>

      {/* Setup Guide */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <Settings size={18} className="text-accent-purple" />
          Quraşdırma Bələdçisi
        </h2>

        <ol className="space-y-4">
          {[
            {
              n: 1,
              title: 'Yeni Google Sheet yaradın',
              desc: 'Google Drive-da yeni bir spreadsheet yaradın.',
            },
            {
              n: 2,
              title: 'Apps Script-i əlavə edin',
              desc: 'Sheet-də Extensions > Apps Script açın. apps-script/Code.gs faylının məzmununu yapışdırın.',
            },
            {
              n: 3,
              title: 'Web App kimi deploy edin',
              desc: 'Deploy > New Deployment > Web App seçin. "Execute as: Me", "Access: Anyone" seçin. URL-i kopyalayın.',
            },
            {
              n: 4,
              title: '.env.local faylını yaradın',
              desc: 'Layihə qovluğunda .env.local faylı yaradın:\nNEXT_PUBLIC_APPS_SCRIPT_URL=sizin-url\nNEXT_PUBLIC_SHEET_URL=sizin-sheet-url',
            },
            {
              n: 5,
              title: 'Sheet-i inisializasiya edin',
              desc: 'Yuxarıdakı "Sheet-i inisializasiya et" düyməsini basın. Bu, bütün lazımi cədvəlləri avtomatik yaradacaq.',
            },
          ].map(step => (
            <li key={step.n} className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue text-xs font-bold flex-shrink-0 mt-0.5">
                {step.n}
              </div>
              <div>
                <div className="text-text-primary text-sm font-medium">{step.title}</div>
                <div className="text-text-secondary text-xs mt-1 whitespace-pre-line leading-relaxed">{step.desc}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Info */}
      <div className="text-text-muted text-xs text-center">
        BirTask v0.1.0 — Google Sheets ilə inteqrasiyalı layihə idarəetmə platforması
      </div>
    </div>
  )
}
