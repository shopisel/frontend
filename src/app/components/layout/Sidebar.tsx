import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Home, List, ScanLine, BarChart2, Bell, User, ShoppingCart, LogOut,
} from "lucide-react";

const navItems = [
  { to: "/",        label: "Home",    icon: Home,      exact: true  },
  { to: "/lists",   label: "Listas",  icon: List,      exact: false },
  { to: "/prices",  label: "Preços",  icon: BarChart2, exact: false },
  { to: "/alerts",  label: "Alertas", icon: Bell,      exact: false },
  { to: "/profile", label: "Perfil",  icon: User,      exact: false },
];

interface SidebarProps {
  onLogout: () => void;
  alertCount?: number;
}

export function Sidebar({ onLogout, alertCount = 0 }: SidebarProps) {
  const navigate = useNavigate();

  return (
    <aside
      className="flex flex-col h-screen bg-[#0F1225] text-white flex-shrink-0"
      style={{ width: 230, borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 cursor-pointer select-none"
        style={{ height: 70, borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        onClick={() => navigate("/")}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)" }}
        >
          <ShoppingCart className="w-4 h-4 text-white" strokeWidth={2} />
        </div>
        <div>
          <p className="font-bold leading-tight" style={{ fontSize: 15, letterSpacing: "-0.3px" }}>
            Shopisel
          </p>
          <p style={{ fontSize: 11, color: "#6B7280" }}>Smart Shopping</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        <p
          className="px-3 mb-2 uppercase tracking-widest"
          style={{ fontSize: 10, color: "#4B5563", fontWeight: 600 }}
        >
          Menu
        </p>
        {navItems.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                isActive
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active background */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: "linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.15) 100%)",
                        border: "1px solid rgba(99,102,241,0.3)",
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    />
                  )}
                </AnimatePresence>

                {/* Active left bar */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-bar"
                    className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                    style={{ background: "linear-gradient(to bottom, #6366F1, #8B5CF6)" }}
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  />
                )}

                <div className="relative z-10 flex items-center gap-3 w-full">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150"
                    style={{
                      background: isActive
                        ? "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)"
                        : "rgba(255,255,255,0.06)",
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={isActive ? 2.2 : 1.8} />
                  </div>

                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: isActive ? 600 : 500,
                      letterSpacing: "-0.1px",
                    }}
                  >
                    {label}
                  </span>

                  {/* Alert badge */}
                  {label === "Alertas" && alertCount > 0 && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                      <span style={{ fontSize: 10, fontWeight: 700 }}>{alertCount}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div
        className="px-3 pb-4 pt-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
        >
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
            <LogOut className="w-3.5 h-3.5" strokeWidth={1.8} />
          </div>
          <span style={{ fontSize: 13.5, fontWeight: 500 }}>Sair</span>
        </motion.button>
      </div>
    </aside>
  );
}
