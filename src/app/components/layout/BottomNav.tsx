import { motion } from "motion/react";
import { Home, List, ScanLine, BarChart2, User } from "lucide-react";

export type AppTab = "home" | "lists" | "scan" | "prices" | "profile";

const tabs: { id: AppTab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "lists", label: "Lists", icon: List },
  { id: "scan", label: "Scan", icon: ScanLine },
  { id: "prices", label: "Prices", icon: BarChart2 },
  { id: "profile", label: "Profile", icon: User },
];

interface BottomNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div
      className="flex items-stretch bg-white border-t border-gray-100 px-2 py-2 pb-3"
      style={{ boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const isScan = tab.id === "scan";

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex-1 flex flex-col items-center justify-center gap-1 relative"
          >
            {/* Scan tab - special styling */}
            {isScan ? (
              <div className="relative -mt-6">
                <motion.div
                  className="w-14 h-14 rounded-[18px] flex items-center justify-center shadow-xl"
                  animate={{ backgroundColor: isActive ? "#4F46E5" : "#6366F1" }}
                  whileTap={{ scale: 0.92 }}
                >
                  <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                </motion.div>
              </div>
            ) : (
              <div className="relative flex flex-col items-center gap-1 w-full py-1">
                {/* Active indicator pill */}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-1.5 w-8 h-1 rounded-full bg-indigo-600"
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  />
                )}
                <div className="relative">
                  <Icon
                    className="w-6 h-6 transition-colors"
                    style={{ color: isActive ? "#6366F1" : "#9CA3AF" }}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "#6366F1" : "#9CA3AF",
                  }}
                >
                  {tab.label}
                </span>
              </div>
            )}

            {/* Label for scan */}
            {isScan && (
              <span
                style={{
                  fontSize: 10, fontWeight: 600,
                  color: isActive ? "#6366F1" : "#9CA3AF",
                }}
              >
                {tab.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
