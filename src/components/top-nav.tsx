import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/practice", label: "Practice" },
  { href: "/settings", label: "Settings" },
  { href: "/signin", label: "Sign In" },
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-[color:var(--paper)]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3 md:px-8">
        <Link href="/" className="font-display text-xl tracking-wide text-[color:var(--ink)]">
          Speak Easy
        </Link>
        <nav className="flex items-center gap-2 md:gap-3">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1 text-sm text-[color:var(--ink-soft)] transition hover:bg-black/5 hover:text-[color:var(--ink)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
