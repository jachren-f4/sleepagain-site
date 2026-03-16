#!/usr/bin/env node
/**
 * Daily KPI email report for Sleep Again.
 *
 * Fetches Umami analytics + Kit subscriber counts, formats an HTML email
 * with trend comparisons, and sends it via Resend.
 *
 * Trends use Umami's built-in `comparison` field — each stats query
 * automatically returns the previous equivalent period (no extra API calls).
 *
 * Required env vars:
 *   RESEND_API_KEY, UMAMI_PASSWORD, KIT_V3_API_SECRET
 *
 * Optional env vars:
 *   UMAMI_USERNAME (default: admin)
 *   REPORT_EMAIL (default: joakim.achren@gmail.com)
 *   RESEND_FROM (default: Sleep Again <joakim@joakimachren.com>)
 *   SUPABASE_URL, SUPABASE_ANON_KEY (for sales snapshot)
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
const REPORT_EMAIL = process.env.REPORT_EMAIL || 'joakim.achren@gmail.com'
const RESEND_FROM = process.env.RESEND_FROM || 'Sleep Again <joakim@joakimachren.com>'
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://reyoeoehuolkghdowjfu.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

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
    const weekStart = dayEnd - 7 * 24 * 60 * 60 * 1000
    const monthStart = dayEnd - 30 * 24 * 60 * 60 * 1000

    const statsUrl = (start, end) =>
      `${baseUrl}/api/websites/${websiteId}/stats?startAt=${start}&endAt=${end}`
    const metricsUrl = (start, end, type) =>
      `${baseUrl}/api/websites/${websiteId}/metrics?startAt=${start}&endAt=${end}&type=${type}`

    // All API calls in parallel
    const [todayRes, weekRes, monthRes, pagesRes, refRes] = await Promise.all([
      fetch(statsUrl(dayStart, dayEnd), { headers: auth }),
      fetch(statsUrl(weekStart, dayEnd), { headers: auth }),
      fetch(statsUrl(monthStart, dayEnd), { headers: auth }),
      fetch(metricsUrl(weekStart, dayEnd, 'url'), { headers: auth }),
      fetch(metricsUrl(weekStart, dayEnd, 'referrer'), { headers: auth })
    ])

    const todayStats = todayRes.ok ? await todayRes.json() : null
    const weekStats = weekRes.ok ? await weekRes.json() : null
    const monthStats = monthRes.ok ? await monthRes.json() : null
    const topPages = pagesRes.ok ? await pagesRes.json() : []
    const topReferrers = refRes.ok ? await refRes.json() : []

    const extractStats = (stats) => {
      if (!stats) return null
      return {
        pageviews: stats.pageviews ?? 0,
        visitors: stats.visitors ?? 0,
        bounces: stats.bounces ?? 0,
        visits: stats.visits ?? 0,
        prev: stats.comparison ? {
          pageviews: stats.comparison.pageviews ?? 0,
          visitors: stats.comparison.visitors ?? 0,
          bounces: stats.comparison.bounces ?? 0,
          visits: stats.comparison.visits ?? 0
        } : null
      }
    }

    return {
      today: extractStats(todayStats),
      last7d: extractStats(weekStats),
      last30d: extractStats(monthStats),
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

// ─── Sales snapshot from Supabase ─────────────────────────────────────────────

async function fetchSalesSnapshot(date) {
  if (!SUPABASE_ANON_KEY) return null

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/analytics_snapshots?date=eq.${date}&select=snapshot`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    )
    if (!res.ok) return null
    const rows = await res.json()
    if (rows.length === 0) return null
    return rows[0].snapshot
  } catch {
    return null
  }
}

// ─── Trend helpers ───────────────────────────────────────────────────────────

function trend(current, previous) {
  if (previous === undefined || previous === null || previous === 0) return ''
  const pct = Math.round(((current - previous) / previous) * 100)
  const arrow = pct > 0 ? '&uarr;' : pct < 0 ? '&darr;' : '&rarr;'
  const color = pct > 0 ? '#16a34a' : pct < 0 ? '#dc2626' : '#999'
  const sign = pct > 0 ? '+' : ''
  return `<span style="color:${color};font-size:12px;margin-left:6px">${arrow} ${sign}${pct}%</span>`
}

function bounceRate(stats) {
  if (!stats || !stats.visits || stats.visits === 0) return '—'
  return Math.round((stats.bounces / stats.visits) * 100) + '%'
}

function bounceRateTrend(stats) {
  if (!stats?.prev || !stats.visits || !stats.prev.visits) return ''
  const current = (stats.bounces / stats.visits) * 100
  const prev = (stats.prev.bounces / stats.prev.visits) * 100
  const diff = Math.round(current - prev)
  if (diff === 0) return ''
  // For bounce rate, DOWN is good
  const arrow = diff < 0 ? '&darr;' : '&uarr;'
  const color = diff < 0 ? '#16a34a' : '#dc2626'
  const sign = diff > 0 ? '+' : ''
  return `<span style="color:${color};font-size:12px;margin-left:6px">${arrow} ${sign}${diff}pp</span>`
}

// ─── Email formatting ────────────────────────────────────────────────────────

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function buildSalesHtml(sales, sectionTitle, row) {
  if (!sales) {
    return `<p style="font-size:13px;color:#999;margin-top:24px;font-style:italic">Sales data unavailable (laptop was offline at 10 AM)</p>`
  }

  const s = sales.sources || {}
  const summary = sales.summary || {}
  let html = sectionTitle('Sales')

  html += '<table style="font-size:14px;border-collapse:collapse">'
  html += row('Total revenue', `$${summary.totalRevenue ?? 0}`)
  html += row('Total orders', summary.totalOrders ?? 0)
  html += '</table>'

  // Lemon Squeezy
  const ls = s.lemonSqueezy
  if (ls?.status === 'ok') {
    html += sectionTitle('Lemon Squeezy')
    html += '<table style="font-size:14px;border-collapse:collapse">'
    html += row('Orders today', ls.orders?.today ?? 0)
    html += row('Revenue today', `$${ls.revenue?.today ?? 0}`)
    html += row('Total orders', ls.orders?.total ?? 0)
    html += row('Total revenue', `$${ls.revenue?.total ?? 0}`)
    html += '</table>'
  }

  // Amazon KDP
  const kdp = s.amazonKdp
  if (kdp?.status === 'manual') {
    html += sectionTitle('Amazon KDP')
    html += '<table style="font-size:14px;border-collapse:collapse">'
    if (kdp.kindle) {
      html += row('Kindle units', kdp.kindle.unitsSold ?? '—')
      if (kdp.kindle.revenue) html += row('Kindle revenue', `$${kdp.kindle.revenue}`)
      if (kdp.kindle.kenpcRead) html += row('KENPC read', kdp.kindle.kenpcRead)
    }
    if (kdp.paperback) {
      html += row('Paperback units', kdp.paperback.unitsSold ?? '—')
      if (kdp.paperback.revenue) html += row('Paperback revenue', `$${kdp.paperback.revenue}`)
    }
    if (kdp.preorders) html += row('Pre-order units', kdp.preorders.netUnits ?? 0)
    html += '</table>'
  }

  // Apple Books
  const ab = s.appleBooks
  if (ab?.status === 'ok' && ab.units > 0) {
    html += sectionTitle('Apple Books')
    html += '<table style="font-size:14px;border-collapse:collapse">'
    html += row('Units', ab.units)
    html += row('Revenue', `$${ab.revenue}`)
    html += '</table>'
  }

  // Lulu Direct
  const lu = s.luluDirect
  if (lu?.status === 'ok' && lu.units > 0) {
    html += sectionTitle('Lulu Direct')
    html += '<table style="font-size:14px;border-collapse:collapse">'
    html += row('Orders', lu.orders)
    html += row('Units', lu.units)
    html += '</table>'
  }

  // Spotify
  const sp = s.spotify
  if (sp?.status === 'manual') {
    html += sectionTitle('Spotify')
    html += '<table style="font-size:14px;border-collapse:collapse">'
    if (sp.streams !== undefined) html += row('Streams', sp.streams)
    if (sp.royalty !== undefined) html += row('Royalty', `$${sp.royalty}`)
    html += '</table>'
  }

  // Kobo
  const ko = s.kobo
  if (ko?.status === 'manual') {
    html += sectionTitle('Kobo')
    html += '<table style="font-size:14px;border-collapse:collapse">'
    if (ko.units !== undefined) html += row('Units', ko.units)
    if (ko.revenue !== undefined) html += row('Revenue', `$${ko.revenue}`)
    html += '</table>'
  }

  return html
}

function buildHtml(date, umami, kit, sales) {
  const d = formatDate(date)

  const row = (label, value) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#666">${label}</td><td style="padding:4px 0;font-weight:600">${value}</td></tr>`

  const trendRow = (label, current, previous) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#666">${label}</td><td style="padding:4px 0;font-weight:600">${current}${trend(current, previous)}</td></tr>`

  const sectionTitle = (title) =>
    `<h2 style="font-size:14px;color:#1B2340;margin:24px 0 8px 0;padding-bottom:4px;border-bottom:1px solid #eee">${title}</h2>`

  const t = umami.today
  const w = umami.last7d
  const m = umami.last30d

  let topPagesHtml = ''
  if (umami.topPages?.length > 0) {
    topPagesHtml = sectionTitle('Top Pages <span style="font-size:11px;color:#999;font-weight:normal">(7 days)</span>') +
      '<table style="font-size:14px;border-collapse:collapse">' +
      umami.topPages.map(p =>
        row(p.x === '/' ? '/' : p.x.replace(/\.html$/, ''), p.y)
      ).join('') + '</table>'
  }

  let referrersHtml = ''
  if (umami.topReferrers?.length > 0) {
    referrersHtml = sectionTitle('Top Referrers <span style="font-size:11px;color:#999;font-weight:normal">(7 days)</span>') +
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
    ${trendRow('Pageviews', t?.pageviews ?? 0, t?.prev?.pageviews)}
    ${trendRow('Visitors', t?.visitors ?? 0, t?.prev?.visitors)}
    ${row('Bounce rate', (bounceRate(t)) + bounceRateTrend(t))}
  </table>
  <p style="font-size:11px;color:#bbb;margin:4px 0 0 0">vs day before</p>

  ${sectionTitle('Last 7 Days <span style="font-size:11px;color:#999;font-weight:normal">vs previous 7 days</span>')}
  <table style="font-size:14px;border-collapse:collapse">
    ${trendRow('Pageviews', w?.pageviews ?? 0, w?.prev?.pageviews)}
    ${trendRow('Visitors', w?.visitors ?? 0, w?.prev?.visitors)}
  </table>

  ${sectionTitle('Last 30 Days <span style="font-size:11px;color:#999;font-weight:normal">vs previous 30 days</span>')}
  <table style="font-size:14px;border-collapse:collapse">
    ${trendRow('Pageviews', m?.pageviews ?? 0, m?.prev?.pageviews)}
    ${trendRow('Visitors', m?.visitors ?? 0, m?.prev?.visitors)}
  </table>

  ${topPagesHtml}
  ${referrersHtml}

  ${sectionTitle('Email List')}
  <table style="font-size:14px;border-collapse:collapse">
    ${row('Total subscribers', kit.total ?? '—')}
    ${row('ARC readers', kit.arcReaders ?? '—')}
    ${row('Waitlist', kit.waitlist ?? '—')}
  </table>

  ${buildSalesHtml(sales, sectionTitle, row)}

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

  const [umami, kit, sales] = await Promise.all([
    UMAMI_PASSWORD ? fetchUmami(TARGET_DATE) : { error: 'UMAMI_PASSWORD not set' },
    KIT_V3_API_SECRET ? fetchKit() : { error: 'KIT_V3_API_SECRET not set' },
    fetchSalesSnapshot(TARGET_DATE)
  ])

  const subject = `Sleep Again KPIs — ${formatDate(TARGET_DATE)}`
  const html = buildHtml(TARGET_DATE, umami, kit, sales)

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
