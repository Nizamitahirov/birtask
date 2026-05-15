'use client'

import { useEffect, useState, useRef } from 'react'
import { db } from '@/lib/db'
import { Comment } from '@/lib/types'
import { useAuth } from '@/contexts/AuthContext'
import { MessageSquare, Send, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface CommentSectionProps {
  entityType: 'project' | 'task'
  entityId: string
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'İndi'
  if (diff < 3600) return `${Math.floor(diff / 60)} dəq əvvəl`
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat əvvəl`
  if (diff < 604800) return `${Math.floor(diff / 86400)} gün əvvəl`
  if (diff < 2592000) return `${Math.floor(diff / 604800)} həftə əvvəl`
  return `${Math.floor(diff / 2592000)} ay əvvəl`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const AVATAR_COLORS = [
  '#3B82F6', '#8B5CF6', '#06B6D4', '#10B981',
  '#F59E0B', '#EC4899', '#EF4444', '#F97316',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function CommentSection({ entityType, entityId }: CommentSectionProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const fetchComments = async () => {
    const res = await db.comments.getAll(entityType, entityId)
    if (res.success && res.data) setComments(res.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId])

  const handleSubmit = async () => {
    if (!text.trim() || !user) return
    setSubmitting(true)
    const res = await db.comments.create({
      entityType,
      entityId,
      userId: user.id,
      userDisplayName: user.displayName || user.username,
      content: text.trim(),
    })
    if (res.success) {
      setText('')
      await fetchComments()
      toast.success('Şərh əlavə edildi')
    } else {
      toast.error(res.error || 'Şərh əlavə edilmədi')
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const res = await db.comments.delete(id)
    if (res.success) {
      setComments(prev => prev.filter(c => c.id !== id))
      toast.success('Şərh silindi')
    } else {
      toast.error(res.error || 'Şərh silinmədi')
    }
    setDeletingId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canDelete = (comment: Comment) => {
    if (!user) return false
    return user.id === comment.userId || user.role === 'admin'
  }

  return (
    <div className="card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare size={16} className="text-accent-blue flex-shrink-0" />
        <h3 className="font-semibold text-text-primary text-sm">
          Şərhlər
          {comments.length > 0 && (
            <span className="ml-2 text-xs font-normal text-text-muted bg-white/[0.05] px-2 py-0.5 rounded-full">
              {comments.length}
            </span>
          )}
        </h3>
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-white/[0.06] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 rounded bg-white/[0.06]" />
                <div className="h-3 w-3/4 rounded bg-white/[0.04]" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center">
          <MessageSquare size={28} className="mx-auto mb-2 text-text-muted opacity-40" />
          <p className="text-text-muted text-sm">Hələ şərh yoxdur</p>
          <p className="text-text-muted text-xs mt-1 opacity-70">İlk şərhi siz yazın</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => {
            const initials = getInitials(comment.userDisplayName)
            const avatarColor = getAvatarColor(comment.userDisplayName)
            const isOwn = user?.id === comment.userId
            return (
              <div key={comment.id} className="flex gap-3 group">
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: avatarColor }}
                >
                  {initials}
                </div>
                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={cn('text-xs font-semibold', isOwn ? 'text-accent-blue' : 'text-text-primary')}>
                      {comment.userDisplayName}
                      {isOwn && <span className="ml-1 text-[10px] font-normal text-text-muted">(siz)</span>}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {getRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <div
                    className="text-sm text-text-secondary leading-relaxed rounded-xl px-3 py-2"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
                  >
                    {comment.content}
                  </div>
                </div>
                {/* Delete */}
                {canDelete(comment) && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0 mt-5"
                  >
                    {deletingId === comment.id
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Trash2 size={12} />}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Input area */}
      {user && (
        <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: getAvatarColor(user.displayName || user.username) }}
          >
            {getInitials(user.displayName || user.username)}
          </div>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Şərh yazın... (Ctrl+Enter göndər)"
              className="w-full resize-none rounded-xl text-sm text-text-primary placeholder:text-text-muted px-3 py-2 pr-10 focus:outline-none focus:ring-1 transition-all"
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                '--tw-ring-color': 'rgba(59,130,246,0.4)',
              } as React.CSSProperties}
            />
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || submitting}
              className={cn(
                'absolute right-2 bottom-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                text.trim() && !submitting
                  ? 'bg-accent-blue text-white hover:bg-accent-blue/80'
                  : 'text-text-muted cursor-not-allowed'
              )}
            >
              {submitting
                ? <Loader2 size={13} className="animate-spin" />
                : <Send size={13} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
