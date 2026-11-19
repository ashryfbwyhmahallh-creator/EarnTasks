export default function BlockedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-center">
      <div>
        <h1 className="text-3xl font-bold text-white">Access blocked</h1>
        <p className="mt-3 max-w-md text-white/60">
          High-confidence VPN, proxy, Tor, or datacenter traffic was detected. EarnTasks offers require a
          normal residential connection. Disable any VPN/proxy and try again.
        </p>
      </div>
    </main>
  );
}