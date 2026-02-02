# Sleep Again Website Documentation

## Overview

Website for "Sleep Again: Finding Rest in a World Built on Urgency" by Joakim Achrén.

- **Live URL:** https://sleepagain.co
- **Repository:** https://github.com/jachren-f4/sleepagain-site
- **Book Launch:** April 9th, 2026

---

## File Structure

```
website/
├── index.html          # Homepage with hero, waitlist form
├── about.html          # About the book
├── chapters.html       # Table of contents
├── author.html         # Author bio, photo, social links
├── css/
│   └── styles.css      # All styling (current version: v=7)
├── js/
│   └── main.js         # Mobile nav toggle (current version: v=1)
├── assets/
│   ├── book_cover2.png # Book cover image
│   └── joakim.png      # Author photo
├── CNAME               # Custom domain config
└── docs/
    └── README.md       # This file
```

---

## Tech Stack

- **HTML/CSS/JS** - Static site, no build tools
- **Google Fonts** - Source Serif 4
- **Tally** - Email collection (unlimited submissions free)
- **GitHub Pages** - Hosting (free)
- **GoDaddy** - Domain registrar

---

## Design Specs

| Element | Value |
|---------|-------|
| Primary color | `#031D34` (dark blue) |
| Background | `#EFEEEA` (warm off-white, matches book cover) |
| Font | Source Serif 4 |
| Book cover max-width | 526px (desktop), 330px (mobile) |
| Spacing lg | 2.5rem |
| Spacing xl | 3rem |

---

## Style Guidelines

- **Author name:** Always use "Achrén" with the accent (not "Achren")
- **No em dashes:** Use commas, colons, or periods instead of "—"
- **Year:** Copyright and dates should use 2026

---

## Deployment

### GitHub Pages

The site auto-deploys when you push to the `main` branch.

```bash
cd /Users/joakimachren/Desktop/book/website
git add .
git commit -m "Your message"
git push
```

Changes typically appear within 1-2 minutes.

### HTTPS Setup

GitHub Pages provisions a TLS certificate automatically. To enable:

1. Go to https://github.com/jachren-f4/sleepagain-site/settings/pages
2. Wait for "TLS certificate is being provisioned" to complete
3. Check the **"Enforce HTTPS"** box
4. Site will then be accessible at https://sleepagain.co

### DNS Configuration (GoDaddy)

**A Records** (pointing to GitHub Pages):
- 185.199.108.153
- 185.199.109.153
- 185.199.110.153
- 185.199.111.153

**CNAME Record:**
- www → jachren-f4.github.io

---

## Making Changes

### Cache Busting

CSS and JS files use version query strings to bust browser cache:

```html
<link rel="stylesheet" href="css/styles.css?v=7">
<script src="js/main.js?v=1"></script>
```

**When changing CSS/JS, bump the version number in ALL HTML files:**

```bash
# Example: v=7 → v=8
# Update in: index.html, about.html, chapters.html, author.html
```

### Testing Locally

Open any HTML file directly in browser:
```bash
open /Users/joakimachren/Desktop/book/website/index.html
```

Force refresh to bypass cache: **Cmd+Shift+R**

---

## Email Collection (Tally)

**Form ID:** `Xx0BeY`
**Dashboard:** https://tally.so/forms/Xx0BeY/submissions
**Form URL:** https://tally.so/r/Xx0BeY

Forms appear on:
- Homepage hero
- Homepage footer
- About page CTA
- Chapters page CTA
- Author page footer

Tally free tier allows **unlimited submissions**. Switched from Formspree (50/month limit) on 2026-02-02.

---

## Social Links

Links to Joakim's profiles appear in:
- Homepage hero
- All page footers
- Author page bio

| Platform | URL |
|----------|-----|
| X (Twitter) | https://x.com/joakim_a |
| LinkedIn | https://www.linkedin.com/in/jachren/ |
| Substack | https://elitegamedevelopers.substack.com/ |

---

## Key Commits

| Commit | Description |
|--------|-------------|
| `37883bc` | Before announcement bar (revert point) |
| `ce746a7` | Formspree integration |
| `c331af2` | Author photo + Amazon book link |
| `2c20233` | Social links everywhere |
| `5055695` | Author name with accent (Achrén) |
| `c9c625a` | Em dashes removed |
| `09ffccc` | Reduced vertical spacing by 50% |

### Reverting Changes

To revert to a specific commit:
```bash
git reset --hard <commit-hash>
git push --force
```

---

## Pages Overview

### Homepage (index.html)
- Announcement bar with launch date
- Hero with book cover, title, author byline ("by Joakim Achrén")
- Email signup form
- Social links (X, LinkedIn, Substack)
- "Why This Book?" section with 3 feature cards

### About (about.html)
- Extended book description
- Who it's for
- What you'll learn
- Email signup CTA

### Chapters (chapters.html)
- Full table of contents
- All 6 parts with chapter listings
- Email signup CTA

### Author (author.html)
- Author photo
- Bio
- Link to previous book (The Long-Term Game on Amazon)
- Social links

---

## Responsive Breakpoints

- **Mobile:** < 768px (hamburger menu, stacked layout)
- **Tablet:** 768px - 1024px
- **Desktop:** > 1024px

Mobile-specific adjustments:
- Smaller announcement bar text
- Tighter vertical spacing
- Book cover: 330px max-width
- Stacked hero layout (book above text)

---

## External Links

| Resource | URL |
|----------|-----|
| Live site | https://sleepagain.co |
| GitHub repo | https://github.com/jachren-f4/sleepagain-site |
| GitHub Pages settings | https://github.com/jachren-f4/sleepagain-site/settings/pages |
| Tally dashboard | https://tally.so/forms/Xx0BeY/submissions |
| Previous book (Amazon) | https://www.amazon.com/Long-Term-Game-Build-Company/dp/952942874X |
| GoDaddy DNS | https://dcc.godaddy.com |

---

## Social Media Announcement

A draft announcement post is saved at:
```
/Users/joakimachren/Desktop/book-announcement.txt
```

**Wait for HTTPS to be enabled before posting** so the link shows as secure.

To check HTTPS status: GitHub repo → Settings → Pages
