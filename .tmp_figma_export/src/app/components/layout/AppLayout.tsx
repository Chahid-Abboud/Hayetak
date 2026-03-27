import { Outlet, Link, useLocation } from "react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Sparkles,
  Utensils,
  Dumbbell,
  MapPin,
  MessageSquare,
  Calendar,
  User,
  Heart,
  Bell,
  Menu,
  X,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
  Flame,
} from "lucide-react";

const PRIMARY_NAV = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/app" },
  { label: "AI Coach", icon: Sparkles, path: "/app/coach" },
  { label: "Meals", icon: Utensils, path: "/app/meals" },
  { label: "Workouts", icon: Dumbbell, path: "/app/workouts" },
  { label: "Nearby", icon: MapPin, path: "/app/nearby" },
  { label: "Messages", icon: MessageSquare, path: "/app/messages" },
  { label: "Appointments", icon: Calendar, path: "/app/appointments" },
];

const BOTTOM_NAV = [
  { label: "Home", icon: LayoutDashboard, path: "/app" },
  { label: "Meals", icon: Utensils, path: "/app/meals" },
  { label: "Workouts", icon: Dumbbell, path: "/app/workouts" },
  { label: "Coach", icon: Sparkles, path: "/app/coach" },
  { label: "Nearby", icon: MapPin, path: "/app/nearby" },
];

function useActiveNav() {
  const location = useLocation();
  const isActive = (path: string) => {
    if (path === "/app") return location.pathname === "/app" || location.pathname === "/app/dashboard";
    return location.pathname.startsWith(path);
  };
  return isActive;
}

function NavItem({ item, compact = false }: { item: (typeof PRIMARY_NAV)[0]; compact?: boolean }) {
  const isActive = useActiveNav();
  const active = isActive(item.path);
  return (
    <Link
      to={item.path}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${
        active
          ? "bg-[#4c1d95]/30 text-[#c4b5fd]"
          : "text-[#78716c] hover:text-[#d6d3d1] hover:bg-[#1c1917]"
      }`}
    >
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#8b5cf6] rounded-full" />
      )}
      <item.icon className={`size-4 flex-shrink-0 ${active ? "text-[#8b5cf6]" : ""}`} />
      {!compact && (
        <span className="text-sm font-medium truncate">{item.label}</span>
      )}
      {item.label === "Messages" && !compact && (
        <span className="ml-auto size-4 rounded-full bg-[#7c3aed] text-[9px] text-white font-bold flex items-center justify-center">
          3
        </span>
      )}
    </Link>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <aside className="w-60 h-full bg-[#0c0a09] border-r border-[#1c1917] flex flex-col">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#1c1917] flex-shrink-0">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center shadow-lg shadow-purple-900/40">
            <Heart className="size-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[#fafaf9] font-semibold tracking-tight">Hayetak</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="p-1 text-[#78716c] hover:text-[#a8a29e] lg:hidden">
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {PRIMARY_NAV.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}

        <div className="pt-3 mt-3 border-t border-[#1c1917] space-y-0.5">
          <Link
            to="/app/settings/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#78716c] hover:text-[#d6d3d1] hover:bg-[#1c1917] transition-all"
          >
            <Settings className="size-4" />
            <span className="text-sm font-medium">Settings</span>
          </Link>
        </div>
      </nav>

      {/* User profile */}
      <div className="border-t border-[#1c1917] p-3">
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[#1c1917] transition-all group"
        >
          <div className="size-8 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">SA</span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-[#d6d3d1] truncate">Sara Al-Rashidi</p>
            <div className="flex items-center gap-1">
              <Flame className="size-3 text-[#f59e0b]" />
              <p className="text-[10px] text-[#78716c]">12 day streak</p>
            </div>
          </div>
          <ChevronRight className={`size-3.5 text-[#44403c] transition-transform ${profileOpen ? "rotate-90" : ""}`} />
        </button>

        {profileOpen && (
          <div className="mt-1 space-y-0.5">
            <Link
              to="/app/settings/profile"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#78716c] hover:text-[#d6d3d1] hover:bg-[#1c1917] transition-all text-sm"
            >
              <User className="size-3.5" /> View Profile
            </Link>
            <Link
              to="/app/settings/2fa"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#78716c] hover:text-[#d6d3d1] hover:bg-[#1c1917] transition-all text-sm"
            >
              <Shield className="size-3.5" /> Security
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#ef4444]/70 hover:text-[#ef4444] hover:bg-[#7f1d1d]/10 transition-all text-sm"
            >
              <LogOut className="size-3.5" /> Sign out
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}

function MobileTopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation();
  const navLabel = PRIMARY_NAV.find((n) =>
    n.path === "/app" ? location.pathname === "/app" : location.pathname.startsWith(n.path)
  )?.label ?? "Hayetak";

  return (
    <div className="flex items-center justify-between h-14 px-4 border-b border-[#1c1917] bg-[#0c0a09] flex-shrink-0 lg:hidden">
      <button onClick={onMenuClick} className="p-1.5 text-[#78716c] hover:text-[#a8a29e] transition-colors">
        <Menu className="size-5" />
      </button>
      <div className="flex items-center gap-2">
        <div className="size-6 rounded-md bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center">
          <Heart className="size-3 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-semibold text-[#fafaf9]">{navLabel}</span>
      </div>
      <button className="relative p-1.5 text-[#78716c] hover:text-[#a8a29e] transition-colors">
        <Bell className="size-5" />
        <span className="absolute top-1 right-1 size-2 rounded-full bg-[#7c3aed]" />
      </button>
    </div>
  );
}

function MobileBottomNav() {
  const isActive = useActiveNav();
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0c0a09]/95 backdrop-blur-md border-t border-[#1c1917] flex items-center px-2">
      {BOTTOM_NAV.map((item) => {
        const active = isActive(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-all ${
              active ? "text-[#8b5cf6]" : "text-[#44403c] hover:text-[#78716c]"
            }`}
          >
            <item.icon className="size-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0c0a09]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-60 flex-shrink-0">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileTopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0 scroll-smooth">
          <Outlet />
        </main>

        <MobileBottomNav />
      </div>
    </div>
  );
}

/* Simple placeholder for unbuilt pages */
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="size-16 rounded-2xl bg-[#1c1917] border border-[#292524] flex items-center justify-center mb-6">
        <Sparkles className="size-8 text-[#8b5cf6]" />
      </div>
      <h2 className="text-xl font-bold text-[#fafaf9] mb-2">{title}</h2>
      <p className="text-sm text-[#78716c] max-w-xs leading-relaxed">
        This section is part of the next batch. Coming very soon.
      </p>
      <Link
        to="/app"
        className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-sm font-medium transition-all"
      >
        Back to dashboard
      </Link>
    </div>
  );
}