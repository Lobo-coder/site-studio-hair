import Image from "next/image";
import Link from "next/link";

/**
 * Marca do Studio Hair. O logo completo (public/logo.png, 900×1027) tem letras brancas:
 * só funciona em fundo escuro. Em fundo claro usamos a flor (public/flor.png) + o nome em texto.
 */
export function Logo({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <Image src="/flor.png" alt="" width={400} height={377} className="h-10 w-auto" priority />
      <span className="flex flex-col leading-none">
        <span className="font-display text-2xl font-semibold text-ink">{name}</span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.35em] text-primary">Premium</span>
      </span>
    </span>
  );
}

/** Logo completo, para fundo escuro. */
export function FullLogo({ name, className }: { name: string; className?: string }) {
  return <Image src="/logo.png" alt={name} width={900} height={1027} priority className={className} />;
}

export function Brand({ name, href = "/" }: { name: string; href?: string }) {
  return (
    <Link href={href} aria-label={name}>
      <Logo name={name} />
    </Link>
  );
}
