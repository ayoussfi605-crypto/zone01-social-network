import Link from "next/link";
import LoginForm from "../../../components/auth/LoginForm";
import { checkSession } from "@/src/utils/checkSession";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const isLogin = await checkSession();
  console.log("is login");

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
          VIBE
        </Link>
        <div className="mx-auto w-full max-w-xl py-8 lg:py-12">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-[#6B7280]">
            Your space, your pace
          </p>
          <h2 className="max-w-lg text-4xl font-bold leading-tight text-[#111827] sm:text-5xl">
            Welcome back to the vibe tribe.
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-[#262626]">
            A calmer corner of the internet, made better by the people you
            choose.
          </p>
          <blockquote className="mt-10 rounded-2xl border border-white bg-white p-5 sm:p-6">
            <p className="text-base leading-7 text-[#262626]">
              “The most calm social experience I&apos;ve ever had. Truly a
              breath of fresh air.”
            </p>
            <footer className="mt-4 text-sm font-semibold text-[#111827]">
              David Chen{" "}
              <span className="font-normal text-[#6B7280]">· Designer</span>
            </footer>
          </blockquote>
        </div>
        <p className="text-xs font-medium text-[#6B7280]">
          A softer place to show up.
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-16">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B7280]">
              Welcome back
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#111827]">Login</h1>
            <p className="mt-2 text-sm text-[#6B7280]">
              Enter your details to continue your journey.
            </p>
          </div>
          <LoginForm />
          <div className="mt-7 flex items-center gap-4 text-xs text-[#6B7280]">
            <span className="h-px flex-1 bg-[#E5E7EB]" />
            or continue with
            <span className="h-px flex-1 bg-[#E5E7EB]" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#111827]"
            >
              <span className="font-bold">G</span> Google
            </button>
            <button
              type="button"
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#111827]"
            >
              <span className="text-base">●</span> Apple
            </button>
          </div>
          <p className="mt-7 text-center text-sm text-[#6B7280]">
            New to VIBE?{" "}
            <Link
              href="/register"
              className="font-semibold text-black underline underline-offset-4"
            >
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
