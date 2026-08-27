import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const WIKI_DIR = path.join(process.cwd(), 'content/wiki');

export interface WikiFrontmatter {
  title: string;
  description?: string;
  category: string;
  order?: number;
}

export interface WikiPage extends WikiFrontmatter {
  slug: string;
  content: string;
}

export interface NavPage {
  slug: string;
  title: string;
  order: number;
}

export interface NavCategory {
  category: string;
  pages: NavPage[];
}

/** All wiki page slugs, derived from filenames in content/wiki/*.mdx */
export function getAllSlugs(): string[] {
  return fs
    .readdirSync(WIKI_DIR)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx$/, ''));
}

/** Load and parse a single wiki page by its slug. Returns null if it doesn't exist. */
export function getPageBySlug(slug: string): WikiPage | null {
  const filePath = path.join(WIKI_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);

  return {
    slug,
    title: (data.title as string) ?? slug,
    description: (data.description as string) ?? '',
    category: (data.category as string) ?? 'Uncategorised',
    order: (data.order as number) ?? 0,
    content,
  };
}

/** All wiki pages, sorted alphabetically by title. */
export function getAllPages(): WikiPage[] {
  return getAllSlugs()
    .map((slug) => getPageBySlug(slug))
    .filter((page): page is WikiPage => page !== null)
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** Pages grouped by category, for rendering the sidebar and homepage. */
export function getNavTree(): NavCategory[] {
  const pages = getAllPages();
  const map = new Map<string, NavCategory>();

  for (const page of pages) {
    if (!map.has(page.category)) {
      map.set(page.category, { category: page.category, pages: [] });
    }
    map.get(page.category)!.pages.push({
      slug: page.slug,
      title: page.title,
      order: page.order ?? 0,
    });
  }

  const tree = Array.from(map.values());
  tree.forEach((cat) =>
    cat.pages.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
  );
  tree.sort((a, b) => a.category.localeCompare(b.category));

  return tree;
}
