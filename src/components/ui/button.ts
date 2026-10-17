/** Classes de botão compartilhadas (servem para <button> e para <a>/<Link>). */
const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  outline: "border border-line bg-surface text-ink hover:border-primary hover:text-primary",
  ghost: "text-muted hover:bg-surface-2 hover:text-ink",
  danger: "border border-danger/30 bg-surface text-danger hover:bg-danger-soft",
  whatsapp: "bg-whatsapp text-white hover:bg-whatsapp-hover",
} as const;

const sizes = { sm: "h-9 px-4 text-sm", md: "h-11 px-5 text-sm", lg: "h-13 px-7 text-base" } as const;

export function btn(variant: keyof typeof variants = "primary", size: keyof typeof sizes = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export const inputClass =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none";
