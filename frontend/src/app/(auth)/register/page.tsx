import Link from "next/link";
import RegisterForm from "../../../components/auth/RegisterForm";
import { checkSession } from "@/src/utils/checkSession";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  const isLogin = await checkSession();
  if (isLogin) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section
        className="flex min-h-[390px] flex-col justify-between px-6 py-7 sm:px-12 sm:py-10 lg:min-h-screen lg:px-16 lg:py-14"
        style={{
          backgroundImage: "linear-gradient(140deg, #FFFFFF 0%, #C2DCFB 100%)",
        }}
      >
        <Link
          href="/"
          className="text-2xl font-black tracking-[0.22em] text-[#111827]"
        >
          Socil Network
        </Link>
        <div className="mx-auto w-full max-w-xl py-8 lg:py-12">
          <span className="inline-flex rounded-full border border-white bg-white px-3 py-1.5 text-xs font-bold text-[#111827]">
            Join 12k+ creators
          </span>
          <h2 className="mt-5 max-w-lg text-4xl font-bold leading-tight text-[#111827] sm:text-5xl">
            Define your Socil Network. Share your story.
          </h2>
          <blockquote className="mt-10 rounded-2xl border border-white bg-white p-5 sm:p-6">
            <p className="text-base leading-7 text-[#262626]">
              “Finally, a place where creativity isn&apos;t measured by likes,
              but by connection.”
            </p>
            <footer className="mt-4 text-sm font-semibold text-[#111827]">
              The Socil Network community
            </footer>
          </blockquote>
        </div>
        <p className="text-xs font-medium text-[#6B7280]">
          Make room for what feels like you.
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-16">
        <div className="w-full max-w-md">
          <div className="mb-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
              Start here
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#111827]">
              Create Account
            </h1>
            <p className="mt-2 text-sm text-[#6B7280]">
              Join the global community of creators.
            </p>
          </div>
          <RegisterForm />
          <p className="mt-4 text-center text-sm text-zinc-500">
            Have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-black underline underline-offset-4"
            >
              Log in to Socil Network
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
