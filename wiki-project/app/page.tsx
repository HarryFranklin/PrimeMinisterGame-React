export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-10 md:px-12 md:py-16">
      <header className="mb-12">
        <h1 className="text-4xl md:text-5xl font-black mb-4 text-zinc-900 dark:text-zinc-100">
          Utility Framework Wiki
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
          A reference guide for participants exploring how governments measure and improve human wellbeing using utility frameworks.
        </p>
      </header>

      <div className="prose dark:prose-invert max-w-none">
        <p>
          Use the sidebar to navigate the wiki. Each section builds on the last, starting with core concepts and moving through practical applications and limitations.
        </p>
      </div>
    </main>
  );
}