# Control Group Wiki

A hyperlinked wiki built with Next.js (App Router) + TypeScript + Tailwind CSS v4,
for writing out the Control Group's in-game reference materials as richly formatted,
cross-linked pages, with a light/dark mode toggle.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Adding a new wiki page

1. Create a new `.mdx` file in `content/wiki/`, e.g. `content/wiki/some-page.mdx`.
2. Add frontmatter at the top:

   ```md
   ---
   title: "Some Page"
   description: "One-line summary shown under the title."
   category: "Lore"
   order: 1
   ---

   Your content here, in Markdown.
   ```
3. It'll automatically appear in the sidebar and homepage, grouped by `category`.
4. Link to it from any other page with a normal Markdown link:
   `[Some Page](/wiki/some-page)`

The `order` field controls sort order *within* a category (lower first); pages with
no `order` sort by title. Categories themselves are sorted alphabetically.

## Project structure

```
content/wiki/*.mdx        Your wiki pages (frontmatter + Markdown content)
lib/wiki.ts                Reads content/wiki, parses frontmatter, builds nav tree
app/page.tsx                Homepage: card index of all pages by category
app/wiki/[slug]/page.tsx    Renders a single wiki page from its .mdx file
components/Sidebar.tsx      Persistent nav + search + mobile drawer
components/ThemeToggle.tsx  Light/dark toggle (next-themes)
components/mdx/            Styling for every Markdown element (headings, links, etc.)
```

## Notes

- Dark/light mode is a manual toggle (top-right of the sidebar), defaulting to your
  system preference, saved in localStorage.
- Internal links (starting with `/`) render as fast client-side `next/link` navigation;
  external links (`http...`) open in a new tab automatically — no special syntax needed.
