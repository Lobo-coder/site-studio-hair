import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, demoLogin, isAllowedEmail, signIn } from "@/auth";
import { Brand } from "@/components/ui/brand";
import { btn } from "@/components/ui/button";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const [session, { error }, settings] = await Promise.all([auth(), searchParams, getSettings()]);
  if (session?.user && isAllowedEmail(session.user.email)) redirect("/admin");

  async function entrar() {
    "use server";
    await signIn(demoLogin ? "demo" : "google", { redirectTo: "/admin" });
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-8 text-center shadow-soft">
        <div className="flex justify-center">
          <Brand name={settings.nome_negocio} />
        </div>
        <h1 className="mt-6 text-2xl font-semibold">Área do profissional</h1>
        <p className="mt-1 text-sm text-muted">Entre para ver a agenda e gerenciar o site.</p>
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {error === "AccessDenied" ? "Este e-mail não tem acesso ao painel." : "Não foi possível entrar. Tente de novo."}
          </p>
        )}
        <form action={entrar} className="mt-6">
          <button type="submit" className={btn(demoLogin ? "primary" : "outline", "lg", "w-full")}>
            {demoLogin ? "Entrar (demonstração)" : <><GoogleIcon /> Entrar com Google</>}
          </button>
        </form>
        {demoLogin && (
          <p className="mt-4 text-xs text-muted">
            Versão de demonstração: o painel está aberto para você conhecer. Os dados são fictícios.
          </p>
        )}
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
