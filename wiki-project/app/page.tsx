import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { getNavTree, getAllPages, readingMinutes } from '@/lib/wiki';
import CompleteReadingButton from '@/components/CompleteReadingButton';

export default function Home() {
  const nav = getNavTree();
  const pages = getAllPages();

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 md:px-12 md:py-16">
      <header className="mb-12">
        <h1 className="text-4xl md:text-5xl font-black mb-4 text-zinc-900 dark:text-zinc-100">
          Utility Framework Wiki
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl">
          A reference guide for participants exploring how governments measure 
          and improve human wellbeing and what utility frameworks offer compared to traditional methods.
        </p>

        <div className="mt-6">
          <CompleteReadingButton nav={nav} />
        </div>
      </header>

      {pages.length === 0 && (
        <div className="border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center text-zinc-500">
          No pages yet — add <code className="font-mono">.mdx</code> files to{' '}
          <code className="font-mono">content/wiki/</code> to get started.
        </div>
      )}

      <div className="space-y-12">
        {nav.map((cat) => {
          const totalWords = cat.pages.reduce((sum, p) => sum + p.wordCount, 0);
          return (
          <section key={cat.category}>
            <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {cat.category}
              <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-full px-2.5 py-1">
                <Clock size={12} />
                {readingMinutes(totalWords)} min read
              </span>
            </h2>
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
          );
        })}
      </div>
    </main>
  );
}