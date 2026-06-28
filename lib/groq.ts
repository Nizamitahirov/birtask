import Groq from 'groq-sdk'

// Configurable via the GROQ_MODEL env var (falls back to a sensible default).
export const GROQ_MODEL = process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile'

export function getGroq(): Groq {
  // Trim to tolerate stray spaces / newlines pasted into the env var value.
  const apiKey = process.env.GROQ_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('GROQ_API_KEY mühit dəyişəni təyin edilməyib')
  }
  return new Groq({ apiKey })
}

export async function groqComplete(opts: {
  system?: string
  prompt: string
  temperature?: number
  maxTokens?: number
}): Promise<string> {
  const { system, prompt, temperature = 0.6, maxTokens = 1200 } = opts
  const groq = getGroq()
  const messages: { role: 'system' | 'user'; content: string }[] = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: prompt })

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  })
  return completion.choices[0]?.message?.content?.trim() || ''
}
