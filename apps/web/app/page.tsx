import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandWordmark } from "@/components/brand-mark";

function GithubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="h-4 w-4"
    >
      <path d="M12 0.5C5.65 0.5 0.5 5.65 0.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.69-3.87-1.54-3.87-1.54-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18a10.96 10.96 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.68.8.56C20.21 21.39 23.5 17.07 23.5 12 23.5 5.65 18.35 0.5 12 0.5z" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--color-muted)_0%,_var(--color-background)_60%)]"
      />
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <BrandWordmark size="md" />
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/sign-up">
              Get started
              <ArrowRight />
            </Link>
          </Button>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-16 text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Building in public — early preview
        </div>
        <h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
          A simpler way to run SailPoint.
        </h1>
        <p className="mt-6 max-w-xl text-balance text-lg text-muted-foreground">
          Simplified Identity wraps SailPoint Identity Security Cloud with an
          admin UI you actually want to use, and an end-user experience that
          doesn&apos;t feel like 2012 enterprise software.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/sign-up">
              Create your account
              <ArrowRight />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a
              href="https://github.com/AnasSahel/simplified-identity"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GithubIcon />
              View on GitHub
            </a>
          </Button>
        </div>
      </main>

      <footer className="flex items-center justify-between px-6 py-6 text-sm text-muted-foreground sm:px-10">
        <span>© {new Date().getFullYear()} Simplified Identity</span>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/AnasSahel/simplified-identity"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          <span aria-hidden>·</span>
          <span>MIT</span>
        </div>
      </footer>
    </div>
  );
}
