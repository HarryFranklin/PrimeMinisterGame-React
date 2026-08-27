import Link from 'next/link';
import type { MDXComponents } from 'mdx/types';
import type { AnchorHTMLAttributes } from 'react';

function isInternalLink(href: string) {
  return href.startsWith('/') || href.startsWith('#');
}

function WikiAnchor({ href = '', children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const linkClass =
    'font-medium text-indigo-600 dark:text-indigo-400 underline decoration-indigo-300 dark:decoration-indigo-700 underline-offset-2 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors';

  if (isInternalLink(href)) {
    return (
      <Link href={href} className={linkClass}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass} {...props}>
      {children}
    </a>
  );
}

/** Styling for every markdown element rendered inside a wiki page. */
export const mdxComponents: MDXComponents = {
  h1: (props) => (
    <h1 className="text-3xl font-black mt-10 mb-4 text-zinc-900 dark:text-zinc-100 scroll-mt-24" {...props} />
  ),
  h2: (props) => (
    <h2
      className="text-2xl font-bold mt-10 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 scroll-mt-24"
      {...props}
    />
  ),
  h3: (props) => (
    <h3 className="text-xl font-bold mt-8 mb-3 text-zinc-900 dark:text-zinc-100 scroll-mt-24" {...props} />
  ),
  p: (props) => <p className="leading-7 mb-4 text-zinc-700 dark:text-zinc-300" {...props} />,
  a: WikiAnchor,
  ul: (props) => <ul className="list-disc pl-6 mb-4 space-y-1 text-zinc-700 dark:text-zinc-300" {...props} />,
  ol: (props) => <ol className="list-decimal pl-6 mb-4 space-y-1 text-zinc-700 dark:text-zinc-300" {...props} />,
  li: (props) => <li className="leading-7" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="border-l-4 border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 pl-4 pr-4 py-2 mb-4 italic text-zinc-700 dark:text-zinc-300 rounded-r-lg"
      {...props}
    />
  ),
  code: (props) => (
    <code
      className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-1.5 py-0.5 rounded text-sm font-mono"
      {...props}
    />
  ),
  pre: (props) => (
    <pre className="bg-zinc-900 dark:bg-black text-zinc-100 p-4 rounded-lg overflow-x-auto mb-4 text-sm" {...props} />
  ),
  hr: () => <hr className="my-8 border-zinc-200 dark:border-zinc-800" />,
  strong: (props) => <strong className="font-bold text-zinc-900 dark:text-zinc-100" {...props} />,
  table: (props) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-left border-collapse" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="border-b-2 border-zinc-300 dark:border-zinc-700 px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100" {...props} />
  ),
  td: (props) => (
    <td className="border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 text-zinc-700 dark:text-zinc-300" {...props} />
  ),
  img: (props) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="rounded-lg border border-zinc-200 dark:border-zinc-800 my-4" alt={props.alt ?? ''} {...props} />
  ),
};
