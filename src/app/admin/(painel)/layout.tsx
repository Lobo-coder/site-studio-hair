import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/admin";
import { getSettings } from "@/lib/data";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Painel", robots: { index: false } };

export default async function PainelLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  const settings = await getSettings();

  async function sair() {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <AdminNav resourcesLabel={plural(settings.rotulo_recurso)} />
          <div className="flex items-center gap-3 text-sm text-muted">
            <Link href="/" target="_blank" className="hidden hover:text-ink sm:inline">
              Ver site
            </Link>
            <span className="hidden max-w-40 truncate md:inline">{user.email}</span>
            <form action={sair}>
              <button type="submit" className="flex items-center gap-1 rounded-full px-3 py-2 hover:bg-surface-2 hover:text-ink">
                <LogOut className="size-4" /> Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
