import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <Link
        href="/"
        className="mb-8 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
      >
        SailSimplified
      </Link>
      {children}
    </div>
  );
}
