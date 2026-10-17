"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Clock, LayoutGrid, Settings, Tag } from "lucide-react";

/** `resourcesLabel` é o nome que o negócio dá às agendas ("Quadras", "Profissionais"…). */
export function AdminNav({ resourcesLabel }: { resourcesLabel: string }) {
  const pathname = usePathname();
  const LINKS = [
    { href: "/admin", label: "Agenda", icon: CalendarDays },
    { href: "/admin/servicos", label: "Serviços", icon: Tag },
    { href: "/admin/recursos", label: resourcesLabel, icon: LayoutGrid },
    { href: "/admin/horarios", label: "Horários", icon: Clock },
    { href: "/admin/configuracoes", label: "Ajustes", icon: Settings },
  ];
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition ${
              active ? "bg-primary text-white" : "text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <Icon className="size-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
