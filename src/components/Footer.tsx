import { Link } from "@tanstack/react-router";

const tabs = [
  {
    to: "/" as const,
    label: "Home",
    icon: (active: boolean) => (
      <svg
        viewBox="0 0 24 24"
        className={`h-5 w-5 ${active ? "fill-current" : "fill-none"}`}
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10v10h14V10" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/annonces" as const,
    label: "Annonces",
    icon: (active: boolean) => (
      <svg
        viewBox="0 0 24 24"
        className={`h-5 w-5 ${active ? "fill-current" : "fill-none"}`}
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          d="M3 11.5 18 5l-1.5 7L18 19zM7 13a2 2 0 1 0 0 .01"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    to: "/profil" as const,
    label: "Profil",
    icon: (active: boolean) => (
      <svg
        viewBox="0 0 24 24"
        className={`h-5 w-5 ${active ? "fill-current" : "fill-none"}`}
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <circle cx="12" cy="8" r="3.5" />
        <path d="M4.5 20a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function Footer() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/80 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <Link
              to={tab.to}
              activeProps={{ className: "lf-tab-active" }}
              className="group flex flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-9 w-12 items-center justify-center rounded-xl transition-all ${
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {tab.icon(isActive)}
                  </span>
                  <span className={isActive ? "text-primary" : ""}>
                    {tab.label}
                  </span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
