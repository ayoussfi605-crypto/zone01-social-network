export default function PrivateProfileView({ pending }: { pending: boolean }) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">
        🔒
      </div>
      <h2 className="mt-4 text-xl font-bold text-zinc-900">
        This profile is private
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
        {pending
          ? "Your follow request is waiting for approval. The profile’s posts and activity will be available if it is accepted."
          : "Follow this person to request access to their posts and activity."}
      </p>
    </section>
  );
}
