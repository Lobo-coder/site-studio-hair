/**
 * Login do painel com Google (Auth.js). Só entra quem estiver em ADMIN_EMAILS.
 *
 * Modo demonstração: aparece um botão "Entrar (demonstração)" que não pede conta nenhuma.
 * Liga sozinho em desenvolvimento sem AUTH_GOOGLE_ID; em produção só com DEMO_LOGIN=true
 * (para mostrar o painel a um cliente antes de fechar). NUNCA deixe ligado num site real.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

const isDev = process.env.NODE_ENV !== "production";
export const demoLogin = (isDev && !process.env.AUTH_GOOGLE_ID) || process.env.DEMO_LOGIN === "true";

export function isAllowedEmail(email: string | null | undefined) {
  if (!email) return false;
  if (demoLogin && email === "demo@localhost") return true;
  const allowed = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
  return allowed.includes(email.toLowerCase());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: demoLogin
    ? [
        Credentials({
          id: "demo",
          name: "Demonstração",
          credentials: {},
          authorize: async () => ({ id: "demo", name: "Demonstração", email: "demo@localhost" }),
        }),
      ]
    : [Google],
  secret: process.env.AUTH_SECRET ?? (isDev ? "segredo-so-para-desenvolvimento-troque-em-producao" : undefined),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/admin/login", error: "/admin/login" },
  trustHost: true,
  callbacks: {
    signIn({ user, account, profile }) {
      if (account?.provider === "demo") return demoLogin;
      return account?.provider === "google" && profile?.email_verified === true && isAllowedEmail(user.email);
    },
  },
});
