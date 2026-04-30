# OK ROBOT Blog Style Guide

The canonical reference for authoring HTML-format blog posts. Source of truth: [posts/rising-costs-of-proprietary-llms.html](posts/rising-costs-of-proprietary-llms.html). When that file's styling and this guide diverge, the file wins — update this guide.

Posts must be **single-file self-contained HTML** — no external library/CDN dependencies (Chart.js, etc.). All CSS, fonts, and scripts inline. The blog template at `js/blog-post.js` injects the post's `<head>` styles into the host page and re-creates `<script>` tags so they execute, but inline-only scripts work most reliably.

---

## File location & registration

1. Save the post at `blog/posts/<slug>.html`. Slug uses kebab-case (`rising-costs-of-proprietary-llms`).
2. Add an entry to the **top** of [posts/index.json](posts/index.json) (newest first, ignoring pinned):

```json
{
  "slug": "your-slug-here",
  "title": "Article Title (no smart quotes — use \\\")",
  "date": "YYYY-MM-DD",
  "description": "One- or two-sentence summary that appears on the blog index card and in OG/Twitter meta.",
  "author": "Teckxx",
  "tags": ["ai", "strategy", "..."],
  "format": "html"
}
```

The `"format": "html"` field is required — it tells [`js/blog-post.js`](../js/blog-post.js) to use the HTML pipeline instead of the markdown pipeline.

---

## HTML skeleton

Drop this into a new file and replace the placeholder content. Everything between the comment markers should be customized; everything else stays verbatim.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><!-- TITLE --></title>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400&family=JetBrains+Mono:wght@400;500&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap" rel="stylesheet">
<style>
/* === PASTE THE CSS BLOCK FROM THE "Stylesheet" SECTION BELOW === */
</style>
</head>
<body>
<div class="container">

<h1><!-- TITLE --></h1>
<div class="dateline"><!-- Month DD, YYYY --></div>

<!-- ARTICLE BODY: h2 / h3 / p / tables / charts / callouts -->

<hr>
<p style="color:var(--text3);font-size:14px;font-style:italic">— Teckxx, Founder of <span style="color:#00ff88">OK ROBOT</span></p>
<p style="font-size:14px;color:var(--text2);margin-top:8px"><a href="/index.html#cta" style="color:var(--green-600);border-bottom:1px solid var(--green-200);text-decoration:none;font-weight:500">Sign up here</a> to receive updates on new Blog posts and all things <em><span style="color:#00ff88">OK-ROBOT</span></em></p>

<div class="sources">
<strong>Sources:</strong> <!-- citations -->
</div>

</div>
</body>
</html>
```

---

## Typography

| Family | Use |
|---|---|
| `Newsreader` (display, serif) | h1, h2, h3 |
| `DM Sans` (body, sans) | body text, tables, UI labels |
| `JetBrains Mono` (mono) | code, eyebrow labels, numeric chart values |

| Element | Size | Weight |
|---|---|---|
| Base (`html`) | **19px** | 400 |
| Body line-height | **1.75** | — |
| `h1` | `clamp(32px, 5vw, 48px)` | 700 |
| `h2` | 32px | 600 |
| `h3` | 24px | 500 |
| `.dateline` | 0.85rem | 400 |
| Tables | 0.88rem | — |
| Captions / chart titles | 0.78–0.92rem | — |
| Footer / sources | 0.8–0.85rem | — |

Letter-spacing: `-0.02em` on h1, `-0.01em` on h2.

---

## Color palette

The article-side palette aliases the site's accent green throughout. Keep these names — components reference them.

```
--bg, --bg2, --bg3, --surface           page surfaces (cream→white)
--text, --text2, --text3                text hierarchy (dark→muted)
--border, --border2                     subtle dividers
--green-50 … --green-900                accent scale (anchored on #00ff88)
--teal-*, --coral-*, --amber-*          secondary scales for diagrams
--accent  → var(--green-600)            primary accent text/borders
--coral, --teal, --blue, --red          inline content highlights
```

Both light and dark modes are defined via `prefers-color-scheme: dark`. In dark mode `--accent` resolves to `--green-400` (brighter on dark surfaces).

**Brand coloring rule:** every literal occurrence of "OK ROBOT" or "OK-ROBOT" in body content must be wrapped in `<span style="color:#00ff88">` (use the literal hex, not the token, since `--accent` shifts in dark mode).

---

## Layout

- **Container**: `.container` — `max-width: 760px; margin: 0 auto; padding: 3rem 1.5rem 5rem;`
- Single-column reading layout. No sidebars.
- Charts and tables stretch to container width via `.chart-section` and `.table-wrap` cards.

---

## Section dividers

Every horizontal divider in the post is the brand green (`#00ff88`, 2px). This includes:

- Each `<h2>` (auto `border-top` with `2.5rem` padding above the heading; `h2:first-of-type` exempted)
- The dateline's `border-bottom` (separates the title block from the body)
- The footer `<hr>` (separates the last paragraph from the byline)
- The `.sources` block's `border-top` (separates the body from citations)

Do not insert manual `<hr>` between sections — the auto h2 rule handles it. Do not soften or downgrade these dividers; uniform 2px green is a brand cue.

---

## Component inventory

### Section heading + body

```html
<h2>Major Section Heading</h2>
<p>Body paragraph. Use <strong>strong</strong> for emphasis on important nouns or claims, and <em>em</em> for definitional or rhetorical emphasis.</p>

<h3>Subsection heading</h3>
<p>...</p>
```

### Table (wrapped, with caption)

```html
<div class="table-wrap">
<div class="table-caption">Table N — Caption sentence-cased</div>
<table>
<thead><tr><th>Column</th><th>Column</th></tr></thead>
<tbody>
<tr><td colspan="2" style="font-weight:600; color:var(--accent);">Group label (optional)</td></tr>
<tr><td>Cell</td><td>Cell</td></tr>
</tbody>
</table>
</div>
```

- Tables are numbered sequentially (Table 1, Table 2, …) in document order.
- Group labels inside the table use `color:var(--accent)` (green) or `color:var(--coral)` to differentiate vendors/categories.
- Captions are sentence case after the dash, no period.

### Chart (SVG)

```html
<div class="chart-section">
  <div class="chart-title">Chart title</div>
  <div class="chart-subtitle">Optional subtitle / unit explainer</div>
  <div class="chart-legend">
    <span><span class="dot" style="background: #00B863;"></span>Series A</span>
    <span><span class="dot" style="background: #D85A30;"></span>Series B</span>
  </div>
  <svg id="myChart" role="img" aria-label="Description for screen readers" style="width:100%;height:auto;display:block;font-family:'DM Sans',sans-serif"></svg>
</div>
```

Then render bars/axes via an inline `<script>` at the bottom of `<body>` using DOM APIs. Reference [posts/rising-costs-of-proprietary-llms.html](posts/rising-costs-of-proprietary-llms.html) for vertical and horizontal grouped-bar implementations. Color conventions:

- Primary series: `#00B863` (`--green-600`)
- Secondary series: `#D85A30` (coral)
- Multiplier severity scale: gray → blue → coral → red (`#888780`, `#85B7EB`, `#F0997B`, `#D85A30`, `#A32D2D`)
- Savings / positive delta: `#0F6E56` primary, `#9FE1CB` secondary

### Callout

```html
<div class="callout">
  <strong>The key insight:</strong> One-sentence punch line that you want the reader to walk away with.
</div>
```

Renders as a left-border green card with tinted background. Use sparingly — once or twice per long article max.

### Sources block

```html
<div class="sources">
<strong>Sources:</strong> Citation 1; citation 2; ...
</div>
```

Always at the very end of `.container`, after the footer byline. Plain prose, semicolons between citations.

### Footer (byline + sign-up)

Identical across every post — copy verbatim:

```html
<hr>
<p style="color:var(--text3);font-size:14px;font-style:italic">— Teckxx, Founder of <span style="color:#00ff88">OK ROBOT</span></p>
<p style="font-size:14px;color:var(--text2);margin-top:8px"><a href="/index.html#cta" style="color:var(--green-600);border-bottom:1px solid var(--green-200);text-decoration:none;font-weight:500">Sign up here</a> to receive updates on new Blog posts and all things <em><span style="color:#00ff88">OK-ROBOT</span></em></p>
```

The `<hr>` here picks up the same green styling that appears between sections.

---

## Placement principles for charts and tables

1. **Chart before detail, then table.** A chart shows shape; a table provides exact values. Pair them in that order under a section heading.
2. **Tables that supply evidence for a claim should follow the claim, not precede it.** Don't drop a table cold — write the assertion, then show the data.
3. **Cluster supporting tables next to the prose that names their contents.** If a table lists tools, place it next to the steps/paragraphs that mention those tools. Don't dump all tables at the end of the section.
4. **Use a chart as visual synthesis after a sequence of subsections that walk through related items.** This is the "claim, claim, claim → here's the picture" pattern.
5. **Numbering must match document order.** Renumber `Table N` captions whenever you reorder.

---

## Stylesheet

The full CSS block. Copy verbatim into the `<style>` element of new posts.

```css
:root {
  --bg: #FAFAF8;
  --bg2: #F2F1ED;
  --bg3: #E8E7E3;
  --surface: #FFFFFF;
  --text: #1A1A18;
  --text2: #5A5A56;
  --text3: #8A8A84;
  --text-secondary: var(--text2);
  --border: rgba(0,0,0,.08);
  --border2: rgba(0,0,0,.14);
  --green-50: #E6FFF3; --green-100: #B0FFD7; --green-200: #66FFB3;
  --green-400: #1FE693; --green-600: #00B863; --green-800: #006B3A; --green-900: #002D18;
  --teal-50: #E1F5EE; --teal-100: #9FE1CB; --teal-200: #5DCAA5;
  --teal-400: #1D9E75; --teal-600: #0F6E56; --teal-800: #085041; --teal-900: #04342C;
  --coral-50: #FAECE7; --coral-100: #F5C4B3; --coral-200: #F0997B;
  --coral-400: #D85A30; --coral-600: #993C1D; --coral-800: #712B13;
  --amber-50: #FAEEDA; --amber-100: #FAC775; --amber-200: #EF9F27;
  --amber-400: #BA7517; --amber-600: #854F0B; --amber-800: #633806;
  --accent: var(--green-600);
  --coral: var(--coral-400);
  --teal: var(--teal-600);
  --blue: #185FA5;
  --red: #A32D2D;
  --font-display: 'Newsreader', Georgia, serif;
  --font-body: 'DM Sans', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #141413; --bg2: #1E1E1C; --bg3: #2A2A28;
    --surface: #242422;
    --text: #E8E7E3; --text2: #A8A8A2; --text3: #6A6A64;
    --border: rgba(255,255,255,.08); --border2: rgba(255,255,255,.14);
    --accent: var(--green-400);
    --coral: #F0997B;
    --teal: #5DCAA5;
    --blue: #85B7EB;
    --red: #F09595;
  }
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html { font-size: 19px; scroll-behavior: smooth; }
body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
  line-height: 1.75;
  -webkit-font-smoothing: antialiased;
}
.container {
  max-width: 760px;
  margin: 0 auto;
  padding: 3rem 1.5rem 5rem;
}
h1 {
  font-family: var(--font-display);
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 700;
  line-height: 1.15;
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
  color: var(--text);
}
.dateline {
  font-size: 0.85rem;
  color: var(--text2);
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid #00ff88;
}
h2 {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 600;
  margin: 4rem 0 1rem;
  padding-top: 2.5rem;
  border-top: 2px solid #00ff88;
  line-height: 1.25;
  letter-spacing: -.01em;
  color: var(--text);
}
h2:first-of-type {
  margin-top: 2.8rem;
  padding-top: 0;
  border-top: none;
}
h3 {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 500;
  line-height: 1.3;
  margin: 2rem 0 0.6rem;
  color: var(--text);
}
p { margin-bottom: 1.15rem; color: var(--text2); }
p strong, li strong { color: var(--text); font-weight: 600; }
strong { font-weight: 600; }
em { font-style: italic; }
hr {
  border: none;
  border-top: 2px solid #00ff88;
  margin: 2.5rem 0;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.2rem 0 1.8rem;
  font-size: 0.88rem;
}
th, td {
  text-align: left;
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid var(--border);
}
th {
  font-weight: 600;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text2);
  background: var(--surface);
}
td { vertical-align: top; color: var(--text); }
tr:last-child td { border-bottom: none; }
.table-wrap {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  margin: 1.2rem 0 2rem;
}
.table-wrap table { margin: 0; }
.table-caption {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text2);
  padding: 0.7rem 0.75rem 0;
  background: var(--surface);
}
.chart-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
}
.chart-title {
  font-size: 0.92rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
  color: var(--text);
}
.chart-subtitle {
  font-size: 0.78rem;
  color: var(--text2);
  margin-bottom: 1rem;
}
.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 0.75rem;
  color: var(--text2);
  margin-bottom: 10px;
}
.chart-legend span {
  display: flex;
  align-items: center;
  gap: 5px;
}
.chart-legend .dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
}
.callout {
  background: var(--green-50);
  border-left: 3px solid var(--green-400);
  padding: 1rem 1.25rem;
  margin: 1.5rem 0;
  border-radius: 0 10px 10px 0;
  font-size: 0.95rem;
  color: var(--text);
}
@media (prefers-color-scheme: dark) {
  .callout {
    background: var(--green-900);
    border-left-color: var(--green-400);
    color: var(--green-100);
  }
}
.sources {
  font-size: 0.8rem;
  color: var(--text2);
  line-height: 1.6;
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 2px solid #00ff88;
}
```

---

## Authoring checklist

Before merging a new post, verify:

- [ ] File saved as `blog/posts/<slug>.html` (kebab-case slug, matches index.json)
- [ ] Entry added to top of `blog/posts/index.json` with all required fields including `"format": "html"`
- [ ] No external JS/CSS dependencies (no `<script src="https://...">` tags)
- [ ] All "OK ROBOT" / "OK-ROBOT" mentions wrapped in `<span style="color:#00ff88">`
- [ ] Footer (byline + sign-up) present and matches the canonical snippet exactly
- [ ] Sources block present at the end
- [ ] Tables numbered sequentially in document order
- [ ] Charts have `role="img"` and a meaningful `aria-label`
- [ ] Render-tested locally at `http://localhost:8081/blog-post.html?post=<slug>` — confirm charts render, links work, dark mode looks right
