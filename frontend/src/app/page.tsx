import Link from "next/link";

const features = [
  {
    icon: "👥",
    title: "Followers",
    desc: "Follow public profiles instantly, request private ones.",
  },
  {
    icon: "📝",
    title: "Posts",
    desc: "Public, followers-only or hand-picked private audience.",
  },
  {
    icon: "🏘️",
    title: "Groups",
    desc: "Create groups, invite friends, host events.",
  },
  {
    icon: "💬",
    title: "Chat",
    desc: "Real-time private & group messaging with emojis.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-linear-to-br from-indigo-600 via-violet-600 to-fuchsia-500 text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-xl font-extrabold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
            💬
          </span>
          Sphere
        </div>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-white/15 px-5 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-indigo-700 shadow-lg hover:bg-indigo-50"
          >
            Join free →
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pb-10 pt-14 text-center">
        <h1 className="mx-auto max-w-3xl text-5xl font-extrabold leading-tight">
          Your people. Your posts.
          <br />
          Your world.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-indigo-100">
          A Facebook-like social-network network with followers, groups, events,
          real-time chat and notifications.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/register"
            className="rounded-2xl bg-white px-8 py-3 font-bold text-indigo-700 shadow-xl hover:bg-indigo-50"
          >
            Create account
          </Link>
          <Link
            href="/feed"
            className="rounded-2xl bg-black/20 px-8 py-3 font-semibold backdrop-blur hover:bg-black/30"
          >
            Open feed
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-16 md:grid-cols-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-3xl bg-white/10 p-6 backdrop-blur transition hover:bg-white/15"
          >
            <div className="text-3xl">{f.icon}</div>
            <h3 className="mt-2 font-bold">{f.title}</h3>
            <p className="mt-1 text-sm text-indigo-100">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
