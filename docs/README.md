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
│   └── styles.css      # All styling
├── js/
│   └── main.js         # Mobile nav toggle
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
- **Formspree** - Email collection (free tier: 50 submissions/month)
- **GitHub Pages** - Hosting (free)
- **GoDaddy** - Domain registrar

---

## Design Specs

| Element | Value |
|---------|-------|
| Primary color | `#031D34` (dark blue) |
| Background | `#EFEEEA` (warm off-white) |
| Font | Source Serif 4 |
| Book cover max-width | 526px (desktop), 330px (mobile) |

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
<link rel="stylesheet" href="css/styles.css?v=6">
<script src="js/main.js?v=1"></script>
```

**When changing CSS/JS, bump the version number in ALL HTML files:**

```bash
# Example: v=6 → v=7
# Update in: index.html, about.html, chapters.html, author.html
```

### Testing Locally

Open any HTML file directly in browser:
```bash
open /Users/joakimachren/Desktop/book/website/index.html
```

Force refresh to bypass cache: **Cmd+Shift+R**

---

## Email Collection (Formspree)

**Form ID:** `xaqbdblp`
**Dashboard:** https://formspree.io/forms/xaqbdblp/submissions

Forms appear on:
- Homepage hero
- Homepage footer
- About page CTA
- Chapters page CTA
- Author page footer

Free tier allows 50 submissions/month. Upgrade at formspree.io if needed.

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
- Hero with book cover, title, author byline
- Email signup form
- Social links
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
- Link to previous book (The Long-Term Game)
- Social links

---

## Responsive Breakpoints

- **Mobile:** < 768px (hamburger menu, stacked layout)
- **Tablet:** 768px - 1024px
- **Desktop:** > 1024px

---

## External Links

- **Previous book:** https://www.amazon.com/Long-Term-Game-Build-Company/dp/952942874X
- **GitHub repo:** https://github.com/jachren-f4/sleepagain-site
- **Formspree dashboard:** https://formspree.io/forms/xaqbdblp/submissions
