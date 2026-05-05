export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="text-5xl font-semibold tracking-tight text-zinc-950 sm:text-6xl dark:text-zinc-50">
          SailSimplified
        </h1>
        <p className="mt-6 max-w-xl text-lg text-zinc-600 sm:text-xl dark:text-zinc-400">
          Simplify SailPoint admin and user experience.
        </p>
        <p className="mt-12 text-sm text-zinc-500 dark:text-zinc-500">
          Coming soon — built in public.
        </p>
        <div className="mt-8 flex items-center gap-4 text-sm">
          <a
            href="/sign-in"
            className="rounded-md bg-zinc-950 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Sign in
          </a>
          <a
            href="/sign-up"
            className="rounded-md border border-zinc-200 px-4 py-2 font-medium text-zinc-950 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Sign up
          </a>
        </div>
      </main>
      <footer className="flex items-center justify-center gap-4 border-t border-zinc-200 px-6 py-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
        <a
          href="https://github.com/AnasSahel/sailsimplified"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
        >
          GitHub
        </a>
        <span aria-hidden>·</span>
        <span>MIT</span>
      </footer>
    </div>
  );
}
