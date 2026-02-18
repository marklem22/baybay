"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArchiveIcon,
  ChevronsLeft,
  FileQuestion,
  HouseIcon,
  ListCollapseIcon,
  MenuIcon,
  Moon,
  NotebookIcon,
  PlusCircleIcon,
  Sun,
} from "lucide-react";

interface SidebarProps {
  activePage: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

const navItems = [
  {
    id: "rooms",
    label: "Rooms",
    href: "/",
    icon: <HouseIcon size={18} />,
  },
  {
    id: "add-room",
    label: "Add Room",
    href: "/rooms/new",
    icon: <PlusCircleIcon size={18} />,
  },
  {
    id: "room-type",
    label: "Room Type",
    href: "/room-type",
    icon: <ListCollapseIcon size={18} />,
  },
  {
    id: "archived-rooms",
    label: "Archived Rooms",
    href: "/rooms/archive",
    icon: <ArchiveIcon size={18} />,
  },
  {
    id: "logs",
    label: "Logs",
    href: "/logs",
    icon: <NotebookIcon size={18} />,
  },
  {
    id: "tutorial",
    label: "Tutorial",
    href: "/tutorial",
    icon: <FileQuestion size={18} />,
  },
];

const SunIcon = () => (
  <Sun size={18}/>
);

const MoonIcon = () => (
  <Moon size={18}/>
);

export function Sidebar({ activePage, theme, onToggleTheme }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] md:hidden print:hidden"
        aria-label="Open menu"
      >
        <MenuIcon size={18}/>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden print:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)] transition-all duration-300 md:!sticky md:top-0 md:z-30 md:shrink-0 md:translate-x-0 print:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${collapsed ? "w-[72px]" : "w-[220px]"}`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-[var(--border)] px-4">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
            <Image
              src="/image.jpg"
              alt="Booking"
              fill
              sizes="36px"
              className="object-cover"
              priority
            />
          </div>
          {!collapsed && (
            <span className="text-[0.95rem] font-semibold tracking-tight">
              Booking
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.875rem] font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="flex flex-col gap-2 border-t border-[var(--border)] px-3 py-4">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.875rem] font-medium text-[var(--text-secondary)] transition-all duration-200 hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
          >
            <span className="shrink-0">
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </span>
            {!collapsed && (
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            )}
          </button>

          {/* Collapse toggle - hidden on mobile */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden items-center gap-3 rounded-lg px-3 py-2.5 text-[0.875rem] font-medium text-[var(--text-secondary)] transition-all duration-200 hover:bg-[var(--hover)] hover:text-[var(--text-primary)] md:flex"
          >
            <ChevronsLeft
              size={20}
              strokeWidth={1.8}
              className={`shrink-0 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
