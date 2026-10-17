import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Agenda e horários mudam a toda hora: tudo é renderizado a cada requisição.
  // Cache Components fica desligado para o template ser simples de manter.
  cacheComponents: false,
  partialPrefetching: false,
  // PGlite (banco local do modo demonstração) roda só no Node e fica fora do bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Os .sql são lidos em tempo de execução (montagem automática de banco vazio).
  outputFileTracingIncludes: { "/**": ["./db/*.sql"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
