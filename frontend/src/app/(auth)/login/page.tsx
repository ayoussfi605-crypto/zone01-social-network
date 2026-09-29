"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoginForm from "../../../components/auth/LoginForm";

export default function LoginPage() {
  const router = useRouter();
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 pb-6 pt-8 text-white">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl">
            💬
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-indigo-100">
            Log in to your social-network network
          </p>
        </div>
        <div className="px-8 py-8">
          <LoginForm onSuccess={() => router.push("/feed")} />
          <p className="mt-4 text-center text-sm text-zinc-500">
            No account?{" "}
            <Link
              href="/register"
              className="font-semibold text-indigo-600 hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
