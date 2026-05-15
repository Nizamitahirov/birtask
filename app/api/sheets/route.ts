export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || ''

export async function GET(req: NextRequest) {
  if (!APPS_SCRIPT_URL) {
    return NextResponse.json({ success: false, error: 'Apps Script URL konfiqurasiya edilməyib' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const params = Object.fromEntries(searchParams.entries())

  try {
    const url = new URL(APPS_SCRIPT_URL)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

    const res = await fetch(url.toString(), { redirect: 'follow' })
    const text = await res.text()

    try {
      const data = JSON.parse(text)
      return NextResponse.json(data)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Apps Script cavab xətası: ' + text.slice(0, 300) },
        { status: 500 }
      )
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!APPS_SCRIPT_URL) {
    return NextResponse.json({ success: false, error: 'Apps Script URL konfiqurasiya edilməyib' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body),
      redirect: 'follow',
    })
    const text = await res.text()

    try {
      const data = JSON.parse(text)
      return NextResponse.json(data)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Apps Script cavab xətası: ' + text.slice(0, 300) },
        { status: 500 }
      )
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
