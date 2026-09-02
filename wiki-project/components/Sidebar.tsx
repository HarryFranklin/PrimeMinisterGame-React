'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Menu, X, BookOpen } from 'lucide-react';
import type { NavCategory } from '@/lib/wiki';
import ThemeToggle from './ThemeToggle';

export default function Sidebar({ nav }: { nav: NavCategory[] }) {
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const filteredNav = useMemo(() => {
    if (!query.trim()) return nav;
    const q = query.toLowerCase();
    return nav
      .map((cat) => ({ ...cat, pages: cat.pages.filter((p) => p.title.toLowerCase().includes(q)) }))
      .filter((cat) => cat.pages.length > 0);
  }, [nav, query]);

  const navContent = (
    <>
      <Link href="/" className="flex items-center gap-2 mb-6 px-1" onClick={() => setMobileOpen(false)}>
        <BookOpen size={20} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span className="font-black text-lg text-zinc-900 dark:text-zinc-100">Control Group Wiki</span>
      </Link>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pages..."
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <nav className="space-y-6 overflow-y-auto">
        {filteredNav.length === 0 && <p className="text-sm text-zinc-400 px-1">No pages found.</p>}
        {filteredNav.map((cat) => (
          <div key={cat.category}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2 px-1">
              {cat.category}
            </h4>
            <ul className="space-y-0.5">
              {cat.pages.map((page) => {
                const href = `/wiki/${page.slug}`;
                const active = pathname === href;
                return (
                  <li key={page.slug}>
                    <Link
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        active
                          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {page.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-20">
        <Link href="/" className="flex items-center gap-2">
          <BookOpen size={18} className="text-indigo-600 dark:text-indigo-400" />
          <span className="font-black text-zinc-900 dark:text-zinc-100">Utility Framework Wiki</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          <div className="w-72 max-w-[85vw] bg-white dark:bg-zinc-950 h-full p-5 overflow-y-auto border-r border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-end mb-2">
              <button onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="text-zinc-500">
                <X size={20} />
              </button>
            </div>
            {navContent}
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-72 shrink-0 h-screen sticky top-0 p-6 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        {navContent}
        <div className="mt-auto pt-6 flex justify-between items-center">
          <span className="font-black text-lg text-zinc-900 dark:text-zinc-100">Utility Framework Wiki</span>
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
