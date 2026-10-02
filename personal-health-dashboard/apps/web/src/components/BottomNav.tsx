"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/today", label: "Today" },
  { href: "/trends", label: "Trends" },
  { href: "/explore", label: "Explore" },
  { href: "/reflect", label: "Reflect" },
  { href: "/settings", label: "Data" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="Primary">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          data-active={pathname.startsWith(item.href) ? "true" : "false"}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
