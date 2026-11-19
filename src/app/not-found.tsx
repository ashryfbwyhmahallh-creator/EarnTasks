import Link from "next/link";
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-5xl font-extrabold text-brand-purple">404</h1>
      <p className="mt-3 text-white/60">This page could not be found.</p>
      <Link href="/dashboard" className="mt-6 rounded-lg bg-brand-purple px-5 py-2.5 font-semibold text-white">Go to dashboard</Link>
    </main>
  );
}