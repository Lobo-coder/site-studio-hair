import "server-only";
import { redirect } from "next/navigation";
import { auth, isAllowedEmail } from "@/auth";

/**
 * Garante que quem chama é dono(a) do painel. Usado no layout do painel E em toda
 * server action: esconder um botão não protege nada, a checagem tem que estar no servidor.
 * A lista de e-mails é conferida de novo a cada chamada, então tirar alguém de
 * ADMIN_EMAILS corta o acesso na hora.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !isAllowedEmail(session.user.email)) redirect("/admin/login");
  return session.user;
}
