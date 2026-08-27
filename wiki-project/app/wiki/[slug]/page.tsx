import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { getAllSlugs, getPageBySlug } from '@/lib/wiki';
import { mdxComponents } from '@/components/mdx/MDXComponents';

import UtilityCurveDiagram from '@/components/mdx/UtilityCurveDiagram';
import UtilityInterventionWidget from '@/components/mdx/UtilityInterventionWidget';

/** Tells Next.js which wiki pages to generate at build time. */
export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getPageBySlug(slug);
  if (!page) return {};
  return { title: page.title, description: page.description };
}

export default async function WikiPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return (
    <article className="max-w-3xl mx-auto px-6 py-10 md:px-12 md:py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-zinc-400 text-sm mb-8 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
      >
        <ArrowLeft size={14} /> Back to index
      </Link>

      <p className="text-xs font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mb-2">
        {page.category}
      </p>
      <h1 className="text-3xl md:text-4xl font-black mb-2 text-zinc-900 dark:text-zinc-100">{page.title}</h1>
      {page.description && (
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">{page.description}</p>
      )}

      <div className="prose dark:prose-invert max-w-none">
        <MDXRemote 
          source={page.content} 
          components={{ 
            ...mdxComponents, 
            UtilityCurveDiagram, 
            UtilityInterventionWidget 
          }} 
        />
      </div>
    </article>
  );
}