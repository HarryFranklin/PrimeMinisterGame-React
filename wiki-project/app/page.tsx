import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getNavTree, getAllPages } from '@/lib/wiki';

export default function Home() {
  const nav = getNavTree();
  const pages = getAllPages();

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 md:px-12 md:py-16">
      <header className="mb-12">
        <h1 className="text-4xl md:text-5xl font-black mb-4 text-zinc-900 dark:text-zinc-100">
          Control Group Wiki
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl">
          The in-universe reference for the Control Group – lore, characters, locations and
          mechanics, all cross-linked. Use the sidebar or search to find your way around.
        </p>
      </header>

      {pages.length === 0 && (
        <div className="border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center text-zinc-500">
          No pages yet — add <code className="font-mono">.mdx</code> files to{' '}
          <code className="font-mono">content/wiki/</code> to get started.
        </div>
      )}

      <div className="space-y-12">
        {nav.map((cat) => (
          <section key={cat.category}>
            <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">{cat.category}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {cat.pages.map((page) => (
                <Link
                  key={page.slug}
                  href={`/wiki/${page.slug}`}
                  className="group flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-4 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                >
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{page.title}</span>
                  <ArrowRight
                    size={16}
                    className="text-zinc-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all"
                  />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}