import { useState } from "react";
import { motion } from "motion/react";
import {
  Search, Bell, Plus, ChevronRight, TrendingDown, MapPin, Star,
  ShoppingBag, Zap
} from "lucide-react";

const listItems = [
  { id: 1, name: "Organic Apples", qty: "1 kg", price: "$2.49", store: "FreshMart", checked: false, color: "#ECFDF5", emoji: "🍎" },
  { id: 2, name: "Whole Milk 2L", qty: "2 pcs", price: "$3.20", store: "CostPlus", checked: true, color: "#EFF6FF", emoji: "🥛" },
  { id: 3, name: "Sourdough Bread", qty: "1 loaf", price: "$4.50", store: "BakeryHub", checked: false, color: "#FFF7ED", emoji: "🍞" },
];

const deals = [
  { id: 1, name: "Greek Yogurt", discount: "30% off", price: "$1.89", original: "$2.69", store: "FreshMart", dist: "0.3 mi", color: "#EEF2FF", emoji: "🥣" },
  { id: 2, name: "Free-Range Eggs", discount: "20% off", price: "$3.99", original: "$4.99", store: "NatureMart", dist: "0.7 mi", color: "#ECFDF5", emoji: "🥚" },
  { id: 3, name: "Pasta Pack x5", discount: "15% off", price: "$2.50", original: "$2.95", store: "CostPlus", dist: "1.1 mi", color: "#FFF7ED", emoji: "🍝" },
];

const alerts = [
  { id: 1, name: "Salmon Fillet", drop: "↓ 22%", from: "$12.99", to: "$10.10", store: "FreshMart" },
  { id: 2, name: "Almond Milk", drop: "↓ 15%", from: "$3.49", to: "$2.99", store: "NatureMart" },
];

interface HomeScreenProps {
  onNavigate: (tab: string) => void;
  user?: {
    name?: string;
    email?: string;
    username?: string;
  } | null;
}

export function HomeScreen({ onNavigate, user }: HomeScreenProps) {
  const [quickAdd, setQuickAdd] = useState("");
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set([2]));

  const toggleItem = (id: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#F8F9FC] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-6 pb-5 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-400" style={{ fontSize: 13 }}>Good morning 👋</p>
            <h1 className="text-gray-900" style={{ fontSize: 22, fontWeight: 700 }}>
              {user?.name ? `Welcome back, ${user.name}!` : "Welcome to ShopSmart!"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="relative w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center"
              onClick={() => onNavigate("alerts")}
            >
              <Bell className="w-5 h-5 text-indigo-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
              <button
              className="relative w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center"
              onClick={() => onNavigate("profile")}
            >
              <span className="text-white" style={{ fontSize: 14, fontWeight: 700 }}>
                {user?.name?.trim()?.charAt(0).toUpperCase() || "U"}
              </span>
            </button>
            </div>
          </div>
        </div>

        {/* Quick add */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              value={quickAdd}
              onChange={(e) => setQuickAdd(e.target.value)}
              placeholder="Quick add to list..."
              className="flex-1 bg-transparent outline-none text-gray-700"
              style={{ fontSize: 14 }}
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => onNavigate("lists")}
            className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg"
          >
            <Plus className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Summary stats */}
        <div className="px-5 py-4 flex gap-3">
          {[
            { label: "Items", value: "12", icon: ShoppingBag, color: "#6366F1", bg: "#EEF2FF" },
            { label: "Saved", value: "$4.80", icon: TrendingDown, color: "#10B981", bg: "#ECFDF5" },
            { label: "Alerts", value: "3", icon: Zap, color: "#F59E0B", bg: "#FFFBEB" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex-1 rounded-2xl p-3 flex flex-col gap-1"
                style={{ backgroundColor: stat.bg }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.color + "22" }}>
                  <Icon className="w-4 h-4" style={{ color: stat.color }} strokeWidth={2} />
                </div>
                <span className="text-gray-900" style={{ fontSize: 16, fontWeight: 700 }}>{stat.value}</span>
                <span className="text-gray-500" style={{ fontSize: 11 }}>{stat.label}</span>
              </div>
            );
          })}
        </div>

        {/* Shopping list preview */}
        <div className="px-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-900" style={{ fontSize: 16, fontWeight: 700 }}>My List</h3>
            <button
              onClick={() => onNavigate("lists")}
              className="flex items-center gap-1"
              style={{ fontSize: 13, color: "#6366F1", fontWeight: 600 }}
            >
              See all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
            {listItems.map((item, idx) => (
              <motion.div
                key={item.id}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: idx < listItems.length - 1 ? "1px solid #F3F4F6" : "none" }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                  style={{ backgroundColor: item.color }}
                >
                  {item.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-gray-900"
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      textDecoration: checkedItems.has(item.id) ? "line-through" : "none",
                      color: checkedItems.has(item.id) ? "#9CA3AF" : "#111827",
                    }}
                  >
                    {item.name}
                  </p>
                  <p className="text-gray-400" style={{ fontSize: 12 }}>
                    {item.qty} · {item.store}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#10B981" }}>
                    {item.price}
                  </span>
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      borderColor: checkedItems.has(item.id) ? "#10B981" : "#D1D5DB",
                      backgroundColor: checkedItems.has(item.id) ? "#10B981" : "transparent",
                    }}
                  >
                    {checkedItems.has(item.id) && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Nearby best deals */}
        <div className="mb-4">
          <div className="px-5 flex items-center justify-between mb-3">
            <h3 className="text-gray-900" style={{ fontSize: 16, fontWeight: 700 }}>Nearby Deals</h3>
            <button
              onClick={() => onNavigate("prices")}
              className="flex items-center gap-1"
              style={{ fontSize: 13, color: "#6366F1", fontWeight: 600 }}
            >
              See all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3 px-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {deals.map((deal) => (
              <motion.div
                key={deal.id}
                className="rounded-3xl p-4 flex-shrink-0 w-44 relative overflow-hidden cursor-pointer"
                style={{ backgroundColor: deal.color, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
                whileTap={{ scale: 0.96 }}
                whileHover={{ y: -2 }}
                onClick={() => onNavigate("prices")}
              >
                <div className="text-4xl mb-2">{deal.emoji}</div>
                <p className="text-gray-800" style={{ fontSize: 13, fontWeight: 700 }}>{deal.name}</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#10B981" }}>{deal.price}</span>
                  <span className="line-through" style={{ fontSize: 11, color: "#9CA3AF" }}>{deal.original}</span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-400" style={{ fontSize: 11 }}>{deal.dist}</span>
                </div>
                <div
                  className="absolute top-3 right-3 px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#10B981", fontSize: 10, fontWeight: 700, color: "white" }}
                >
                  {deal.discount}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Active alerts */}
        <div className="px-5 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-900" style={{ fontSize: 16, fontWeight: 700 }}>Active Alerts</h3>
            <button
              onClick={() => onNavigate("alerts")}
              className="flex items-center gap-1"
              style={{ fontSize: 13, color: "#6366F1", fontWeight: 600 }}
            >
              See all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3"
                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-900" style={{ fontSize: 13, fontWeight: 600 }}>{alert.name}</p>
                  <p className="text-gray-400" style={{ fontSize: 12 }}>{alert.store}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#10B981" }}>{alert.drop}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{alert.to}</span>
                    <span className="line-through text-gray-400" style={{ fontSize: 11 }}>{alert.from}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

