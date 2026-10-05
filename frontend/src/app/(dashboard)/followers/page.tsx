import Link from "next/link";

export default function FollowersPage() {
  return (
    <main className="min-h-screen bg-white pb-24 text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-xl px-4 pb-3 pt-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                Your people
              </p>
              <h1 className="text-2xl font-bold">Followers</h1>
            </div>
            <Link
              href="/profile"
              className="text-xs font-semibold text-zinc-600"
            >
              Your profile
            </Link>
          </div>
        </div>
      </header>
    </main>
  );
}
