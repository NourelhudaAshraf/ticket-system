import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../auth/useAuth.js";

// Small outline icons (24×24 grid, drawn with the current text color). Sizes come from classes.
const icons = {
  tickets: "M4 6h16M4 12h16M4 18h10",
  plus: "M12 5v14M5 12h14",
  queue: "M9 5h10M9 12h10M9 19h10M5 5h.01M5 12h.01M5 19h.01",
  folder:
    "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  dashboard: "M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z",
  users:
    "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M21 19v-1a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.74",
  logout: "M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6L6 18",
};

function Icon({ name, className = "size-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path d={icons[name]} />
    </svg>
  );
}

// Navigation links per role.
const linksByRole = {
  Customer: [
    { to: "/tickets", label: "My tickets", icon: "tickets", end: true },
    { to: "/tickets/new", label: "New ticket", icon: "plus" },
  ],
  Agent: [
    { to: "/queue", label: "My queue", icon: "queue" },
    { to: "/categories", label: "Categories", icon: "folder" },
  ],
  Admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
    { to: "/admin/tickets", label: "Tickets", icon: "tickets" },
    { to: "/admin/users", label: "Users", icon: "users" },
    { to: "/admin/categories", label: "Categories", icon: "folder" },
  ],
};

// Each role gets its own badge color.
const roleBadge = {
  Customer: "bg-emerald-100 text-emerald-700",
  Agent: "bg-sky-100 text-sky-700",
  Admin: "bg-violet-100 text-violet-700",
};

// "Nour Elhoda" → "NE"; "nour" → "N".
function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

// Logo, the role's links, and the red Sign out button at the bottom.
// Used twice: fixed on the left from md (48rem), and as a slide-in drawer on phones.
function Sidebar({ role, onNavigate, onSignOut }) {
  const links = linksByRole[role] ?? [];

  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white">
      <Link
        to="/"
        onClick={onNavigate}
        className="flex min-h-16 items-center gap-3 border-b border-slate-200 px-5"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-sky-400 to-indigo-500 text-white shadow-md shadow-indigo-300/40">
          <Icon name="tickets" />
        </span>
        <span className="text-base font-semibold text-slate-900">
          Ticket System
        </span>
      </Link>

      <nav
        aria-label="Main"
        className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
      >
        <p className="px-3 pb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
          Menu
        </p>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all ${
                isActive
                  ? "bg-linear-to-r from-blue-50 to-indigo-100 text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            <Icon name={link.icon} />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <button
          type="button"
          onClick={onSignOut}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
        >
          <Icon name="logout" />
          Sign out
        </button>
      </div>
    </div>
  );
}

// The signed-in user (top right): a pill with a soft gradient background holding the round initials
// icon first, then the name with the role badge under it. On the smallest phones only the icon is shown.
function UserBadge({ user }) {
  return (
    <div
      title={`${user.name} (${user.role})`}
      className="flex items-center gap-3 rounded-full bg-linear-to-r from-blue-50 via-indigo-50 to-purple-100 py-1.5 px-3 sm:pr-5"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sky-400 to-indigo-500 text-sm font-semibold text-white shadow-sm">
        {initials(user.name)}
      </span>
      <div className="hidden leading-tight sm:block">
        <p className="text-sm font-semibold text-slate-900">{user.name}</p>
        <span
          className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge[user.role]}`}
        >
          {user.role}
        </span>
      </div>
    </div>
  );
}

// The frame around every signed-in page, like an admin dashboard: a light sidebar on the left with
// the role's links and Sign out, a top bar with the signed-in user on the right, and the page
// content below it (<Outlet />). On phones the sidebar slides in from the Menu button.
export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-dvh bg-linear-to-br from-slate-50 via-white to-indigo-50/60">
      {/* Desktop: fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 md:block">
        <Sidebar role={user.role} onSignOut={signOut} />
      </aside>

      {/* Phone: slide-in sidebar over a dimmed page */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className="absolute inset-0 bg-slate-900/40"
          />
          <div id="mobile-sidebar" className="relative h-full w-72 max-w-[85%]">
            <Sidebar
              role={user.role}
              onNavigate={closeMenu}
              onSignOut={signOut}
            />
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close menu"
              className="absolute top-2.5 right-2 inline-flex size-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <Icon name="close" />
            </button>
          </div>
        </div>
      )}

      <div className="md:pl-64">
        {/* Top bar: menu button on phones, the signed-in user on the right */}
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-md md:justify-end md:px-8">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-sidebar"
            className="-ml-2 inline-flex size-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 md:hidden"
          >
            <Icon name="menu" className="size-6" />
          </button>
          <UserBadge user={user} />
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
