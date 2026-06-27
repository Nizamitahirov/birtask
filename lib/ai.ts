export type AIKind = 'project' | 'dashboard' | 'analytics' | 'workspace' | 'description'
export type AILang = 'az' | 'en'

/**
 * Call the unified AI endpoint (Groq / Llama 3.3). Returns the generated text.
 * Throws on failure with a human-readable message.
 */
export async function aiGenerate(
  kind: AIKind,
  payload: Record<string, unknown>,
  opts?: { language?: AILang; instruction?: string }
): Promise<string> {
  const res = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind,
      language: opts?.language || 'az',
      instruction: opts?.instruction,
      payload,
    }),
  })
  let data: { text?: string; error?: string } = {}
  try {
    data = await res.json()
  } catch {
    throw new Error('AI cavabı oxuna bilmədi')
  }
  if (!res.ok || data.error || data.text === undefined) {
    throw new Error(data.error || 'AI xətası baş verdi')
  }
  return data.text
}
