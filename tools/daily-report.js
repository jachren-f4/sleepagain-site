#!/usr/bin/env node
/**
 * Daily KPI email report for Sleep Again.
 *
 * Fetches Umami analytics + Kit subscriber counts, formats an HTML email,
 * and sends it via Resend.
 *
 * Required env vars:
 *   RESEND_API_KEY, UMAMI_PASSWORD, KIT_V3_API_SECRET
 *
 * Optional env vars:
 *   UMAMI_USERNAME (default: admin)
 *   REPORT_EMAIL (default: joakim.achren@gmail.com)
 *   RESEND_FROM (default: onboarding@resend.dev)
 *
 * Usage:
 *   node tools/daily-report.js              # send report for yesterday
 *   node tools/daily-report.js --dry-run    # print email HTML, don't send
 *   node tools/daily-report.js --date 2026-03-15
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY
const UMAMI_PASSWORD = process.env.UMAMI_PASSWORD
const KIT_V3_API_SECRET = process.env.KIT_V3_API_SECRET
const UMAMI_USERNAME = process.env.UMAMI_USERNAME || 'admin'
const REPORT_EMAIL = process.env.REPORT_EMAIL || 'joakim@f4.fund'
const RESEND_FROM = process.env.RESEND_FROM || 'Sleep Again <onboarding@resend.dev>'

const DRY_RUN = process.argv.includes('--dry-run')
const dateArg = process.argv.indexOf('--date')
const dateValue = dateArg !== -1 ? process.argv[dateArg + 1] : null

function getYesterdayHelsinki() {
  const now = new Date()
  const helsinki = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }))
  helsinki.setDate(helsinki.getDate() - 1)
  return helsinki.toISOString().slice(0, 10)
}

const TARGET_DATE = dateValue || getYesterdayHelsinki()

// ─── Umami ───────────────────────────────────────────────────────────────────

async function fetchUmami(date) {
  const baseUrl = 'https://umami-gray-one.vercel.app'
  const websiteId = '7af0c0e1-476d-4db7-a786-cd335185dbb6'

  try {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: UMAMI_USERNAME, password: UMAMI_PASSWORD })
    })
    if (!loginRes.ok) return { error: `Login failed: HTTP ${loginRes.status}` }
    const { token } = await loginRes.json()
    const auth = { Authorization: `Bearer ${token}` }

    // Helsinki timezone offset
    const refDate = new Date(`${date}T12:00:00Z`)
    const helsinkiStr = refDate.toLocaleString('en-US', { timeZone: 'Europe/Helsinki', hour12: false })
    const helsinkiDate = new Date(helsinkiStr + ' UTC')
    const offsetMs = helsinkiDate.getTime() - refDate.getTime()
    const offsetHours = offsetMs / 3600000
    const sign = offsetHours >= 0 ? '+' : '-'
    const offsetStr = `${sign}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`

    const dayStart = new Date(`${date}T00:00:00${offsetStr}`).getTime()
    const dayEnd = new Date(`${date}T23:59:59${offsetStr}`).getTime()

    // Today stats
    const todayRes = await fetch(
      `${baseUrl}/api/websites/${websiteId}/stats?startAt=${dayStart}&endAt=${dayEnd}`,
      { headers: auth }
    )
    const todayStats = todayRes.ok ? await todayRes.json() : null

    // Last 7 days
    const weekStart = dayEnd - 7 * 24 * 60 * 60 * 1000
    const weekRes = await fetch(
      `${baseUrl}/api/websites/${websiteId}/stats?startAt=${weekStart}&endAt=${dayEnd}`,
      { headers: auth }
    )
    const weekStats = weekRes.ok ? await weekRes.json() : null

    // Last 30 days
    const monthStart = dayEnd - 30 * 24 * 60 * 60 * 1000
    const monthRes = await fetch(
      `${baseUrl}/api/websites/${websiteId}/stats?startAt=${monthStart}&endAt=${dayEnd}`,
      { headers: auth }
    )
    const monthStats = monthRes.ok ? await monthRes.json() : null

    // Top pages (today)
    const pagesRes = await fetch(
      `${baseUrl}/api/websites/${websiteId}/metrics?startAt=${dayStart}&endAt=${dayEnd}&type=url`,
      { headers: auth }
    )
    const topPages = pagesRes.ok ? await pagesRes.json() : []

    // Top referrers (today)
    const refRes = await fetch(
      `${baseUrl}/api/websites/${websiteId}/metrics?startAt=${dayStart}&endAt=${dayEnd}&type=referrer`,
      { headers: auth }
    )
    const topReferrers = refRes.ok ? await refRes.json() : []

    return {
      today: todayStats ? {
        pageviews: todayStats.pageviews?.value ?? 0,
        visitors: todayStats.visitors?.value ?? 0,
        bounces: todayStats.bounces?.value ?? 0,
        visits: todayStats.visits?.value ?? 0
      } : null,
      last7d: weekStats ? {
        pageviews: weekStats.pageviews?.value ?? 0,
        visitors: weekStats.visitors?.value ?? 0
      } : null,
      last30d: monthStats ? {
        pageviews: monthStats.pageviews?.value ?? 0,
        visitors: monthStats.visitors?.value ?? 0
      } : null,
      topPages: topPages.slice(0, 5),
      topReferrers: topReferrers.filter(r => r.x).slice(0, 5)
    }
  } catch (err) {
    return { error: err.message }
  }
}

// ─── Kit ─────────────────────────────────────────────────────────────────────

async function fetchKit() {
  try {
    const base = 'https://api.convertkit.com/v3'
    const qs = `api_secret=${KIT_V3_API_SECRET}`

    const [subRes, arcRes, waitRes] = await Promise.all([
      fetch(`${base}/subscribers?${qs}`),
      fetch(`${base}/tags/16319185/subscriptions?${qs}`),
      fetch(`${base}/tags/16407733/subscriptions?${qs}`)
    ])

    const subData = subRes.ok ? await subRes.json() : null
    const arcData = arcRes.ok ? await arcRes.json() : null
    const waitData = waitRes.ok ? await waitRes.json() : null

    return {
      total: subData?.total_subscribers ?? '?',
      arcReaders: arcData?.total_subscriptions ?? '?',
      waitlist: waitData?.total_subscriptions ?? '?'
    }
  } catch (err) {
    return { error: err.message }
  }
}

// ─── Email formatting ────────────────────────────────────────────────────────

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function bounceRate(stats) {
  if (!stats || !stats.visits || stats.visits === 0) return '—'
  return Math.round((stats.bounces / stats.visits) * 100) + '%'
}

function buildHtml(date, umami, kit) {
  const d = formatDate(date)

  const row = (label, value) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#666">${label}</td><td style="padding:4px 0;font-weight:600">${value}</td></tr>`

  const sectionTitle = (title) =>
    `<h2 style="font-size:14px;color:#1B2340;margin:24px 0 8px 0;padding-bottom:4px;border-bottom:1px solid #eee">${title}</h2>`

  let topPagesHtml = ''
  if (umami.topPages?.length > 0) {
    topPagesHtml = sectionTitle('Top Pages') +
      '<table style="font-size:14px;border-collapse:collapse">' +
      umami.topPages.map(p =>
        row(p.x === '/' ? '/' : p.x.replace(/\.html$/, ''), p.y)
      ).join('') + '</table>'
  }

  let referrersHtml = ''
  if (umami.topReferrers?.length > 0) {
    referrersHtml = sectionTitle('Top Referrers') +
      '<table style="font-size:14px;border-collapse:collapse">' +
      umami.topReferrers.map(r =>
        row(r.x.replace(/^https?:\/\//, '').replace(/\/$/, ''), r.y)
      ).join('') + '</table>'
  }

  const umamiError = umami.error
    ? `<p style="color:#c00;font-size:13px">Umami error: ${umami.error}</p>`
    : ''

  const kitError = kit.error
    ? `<p style="color:#c00;font-size:13px">Kit error: ${kit.error}</p>`
    : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px;color:#333">
  <h1 style="font-size:18px;color:#1B2340;margin-bottom:4px">Sleep Again — Daily KPIs</h1>
  <p style="font-size:13px;color:#999;margin-top:0">${d}</p>

  ${umamiError}
  ${kitError}

  ${sectionTitle('Yesterday')}
  <table style="font-size:14px;border-collapse:collapse">
    ${row('Pageviews', umami.today?.pageviews ?? '—')}
    ${row('Visitors', umami.today?.visitors ?? '—')}
    ${row('Bounce rate', bounceRate(umami.today))}
  </table>

  ${sectionTitle('Last 7 Days')}
  <table style="font-size:14px;border-collapse:collapse">
    ${row('Pageviews', umami.last7d?.pageviews ?? '—')}
    ${row('Visitors', umami.last7d?.visitors ?? '—')}
  </table>

  ${sectionTitle('Last 30 Days')}
  <table style="font-size:14px;border-collapse:collapse">
    ${row('Pageviews', umami.last30d?.pageviews ?? '—')}
    ${row('Visitors', umami.last30d?.visitors ?? '—')}
  </table>

  ${topPagesHtml}
  ${referrersHtml}

  ${sectionTitle('Email List')}
  <table style="font-size:14px;border-collapse:collapse">
    ${row('Total subscribers', kit.total ?? '—')}
    ${row('ARC readers', kit.arcReaders ?? '—')}
    ${row('Waitlist', kit.waitlist ?? '—')}
  </table>

  <p style="font-size:11px;color:#bbb;margin-top:32px;border-top:1px solid #eee;padding-top:8px">
    <a href="https://umami-gray-one.vercel.app" style="color:#999">Open Umami dashboard</a>
  </p>
</body>
</html>`
}

// ─── Send via Resend ─────────────────────────────────────────────────────────

async function sendEmail(subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [REPORT_EMAIL],
      subject,
      html
    })
  })

  const body = await res.json()
  if (!res.ok) {
    throw new Error(`Resend API error: ${res.status} — ${JSON.stringify(body)}`)
  }
  return body
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const missing = []
  if (!RESEND_API_KEY) missing.push('RESEND_API_KEY')
  if (!UMAMI_PASSWORD) missing.push('UMAMI_PASSWORD')
  if (!KIT_V3_API_SECRET) missing.push('KIT_V3_API_SECRET')
  if (missing.length > 0 && !DRY_RUN) {
    console.error(`Missing env vars: ${missing.join(', ')}`)
    process.exit(1)
  }

  console.log(`Fetching KPIs for ${TARGET_DATE}...`)

  const [umami, kit] = await Promise.all([
    UMAMI_PASSWORD ? fetchUmami(TARGET_DATE) : { error: 'UMAMI_PASSWORD not set' },
    KIT_V3_API_SECRET ? fetchKit() : { error: 'KIT_V3_API_SECRET not set' }
  ])

  const subject = `Sleep Again KPIs — ${formatDate(TARGET_DATE)}`
  const html = buildHtml(TARGET_DATE, umami, kit)

  if (DRY_RUN) {
    console.log(`\nSubject: ${subject}\n`)
    console.log(html)
    console.log('\nDry run — no email sent.')
    return
  }

  console.log('Sending email...')
  const result = await sendEmail(subject, html)
  console.log(`Email sent! ID: ${result.id}`)
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
