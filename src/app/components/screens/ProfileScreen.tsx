import { useState } from "react";
import { motion } from "motion/react";
import {
  ChevronRight, Bell, MapPin, Moon, Shield, CreditCard,
  LogOut, Star, Store, User, Loader, RotateCcw
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import type { Product } from "../../../api/useProducts";
import { ImageWithFallback } from "../fallback/ImageWithFallback";

interface ProfileScreenProps {
  onLogout: () => void;
  user?: {
    name?: string;
    email?: string;
    username?: string;
  } | null;
  favoriteProducts: Product[];
  favoritesLoading: boolean;
  favoritesError: string | null;
  onReloadFavorites: () => Promise<void>;
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0"
      style={{ backgroundColor: value ? "#6366F1" : "#D1D5DB" }}
    >
      <motion.div
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
        animate={{ left: value ? "calc(100% - 20px)" : "4px" }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      />
    </button>
  );
}

const preferredStores = [
  { name: "FreshMart", distance: "0.3 mi", active: true },
  { name: "NatureMart", distance: "0.7 mi", active: true },
  { name: "CostPlus", distance: "1.1 mi", active: false },
  { name: "BioShop", distance: "1.8 mi", active: false },
];

const getProductImageSrc = (product: Product) => {
  const imageValue = product.image?.trim();
  if (!imageValue) return undefined;
  if (/^(https?:|data:|blob:|\/)/i.test(imageValue)) return imageValue;
  return undefined;
};

export function ProfileScreen({
  onLogout,
  user,
  favoriteProducts,
  favoritesLoading,
  favoritesError,
  onReloadFavorites,
}: ProfileScreenProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [dealNotifs, setDealNotifs] = useState(true);
  const [locationTracking, setLocationTracking] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [stores, setStores] = useState(preferredStores);

  const toggleStore = (idx: number) => {
    setStores(prev => prev.map((s, i) => i === idx ? { ...s, active: !s.active } : s));
  };

  const displayName = user?.name || user?.username || "Utilizador";
  const displayEmail = user?.email || "Sem email";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex flex-col h-full bg-[#F8F9FC] overflow-y-auto">
      {/* Header */}
      <div className="px-5 pt-6 pb-6 bg-white">
        <h1 className="text-gray-900 mb-4" style={{ fontSize: 24, fontWeight: 700 }}>Profile</h1>

        {/* User card */}
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <span className="text-white" style={{ fontSize: 24, fontWeight: 700 }}>{initials || "U"}</span>
          </div>
          <div className="flex-1">
            <p className="text-white" style={{ fontSize: 18, fontWeight: 700 }}>{displayName}</p>
            <p className="text-indigo-200" style={{ fontSize: 13 }}>{displayEmail}</p>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 text-yellow-300" fill="#FCD34D" />
              <span className="text-white/80" style={{ fontSize: 12 }}>Premium Member</span>
            </div>
          </div>
          <button className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 mt-4">
          {[
            { label: "Lists", value: "8" },
            { label: "Saved", value: "$142" },
            { label: "Scans", value: "34" },
          ].map((stat) => (
            <div key={stat.label} className="flex-1 bg-gray-50 rounded-2xl p-3 text-center">
              <p className="text-gray-900" style={{ fontSize: 18, fontWeight: 800 }}>{stat.value}</p>
              <p className="text-gray-400" style={{ fontSize: 12 }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-4">
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="w-full h-11 bg-gray-100">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="favorites">Favoritos</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-4">
            <div className="flex flex-col gap-4">
              {/* Preferred stores */}
              <div className="bg-white rounded-3xl p-4" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Store className="w-4 h-4 text-indigo-600" />
                  <p className="text-gray-900" style={{ fontSize: 15, fontWeight: 700 }}>Preferred Stores</p>
                </div>
                <div className="flex flex-col gap-2.5">
                  {stores.map((store, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: store.active ? "#EEF2FF" : "#F9FAFB" }}
                        >
                          <Store className="w-4 h-4" style={{ color: store.active ? "#6366F1" : "#D1D5DB" }} />
                        </div>
                        <div>
                          <p className="text-gray-900" style={{ fontSize: 13, fontWeight: 600 }}>{store.name}</p>
                          <p className="text-gray-400" style={{ fontSize: 11 }}>{store.distance}</p>
                        </div>
                      </div>
                      <Toggle value={store.active} onChange={() => toggleStore(i)} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-white rounded-3xl p-4" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-indigo-600" />
                  <p className="text-gray-900" style={{ fontSize: 15, fontWeight: 700 }}>Notifications</p>
                </div>
                <div className="flex flex-col gap-4">
                  {[
                    { label: "Price Alerts", sub: "Notified when prices drop", value: priceAlerts, onChange: setPriceAlerts },
                    { label: "Deal Notifications", sub: "Weekly deals from stores", value: dealNotifs, onChange: setDealNotifs },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-900" style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</p>
                        <p className="text-gray-400" style={{ fontSize: 12 }}>{item.sub}</p>
                      </div>
                      <Toggle value={item.value} onChange={item.onChange} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Privacy & Location */}
              <div className="bg-white rounded-3xl p-4" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <p className="text-gray-900" style={{ fontSize: 15, fontWeight: 700 }}>Privacy & Location</p>
                </div>
                <div className="flex flex-col gap-4">
                  {[
                    { label: "Location Services", sub: "Find nearby store prices", value: locationTracking, onChange: setLocationTracking },
                    { label: "Biometric Login", sub: "Use Face ID or fingerprint", value: biometric, onChange: setBiometric },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-900" style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</p>
                        <p className="text-gray-400" style={{ fontSize: 12 }}>{item.sub}</p>
                      </div>
                      <Toggle value={item.value} onChange={item.onChange} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Appearance */}
              <div className="bg-white rounded-3xl p-4" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <p className="text-gray-900" style={{ fontSize: 15, fontWeight: 700 }}>Appearance</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-900" style={{ fontSize: 13, fontWeight: 600 }}>Dark Mode</p>
                    <p className="text-gray-400" style={{ fontSize: 12 }}>Easier on the eyes at night</p>
                  </div>
                  <Toggle value={darkMode} onChange={setDarkMode} />
                </div>
              </div>

              {/* Other settings */}
              <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                {[
                  { icon: CreditCard, label: "Subscription & Billing", color: "#6366F1" },
                  { icon: Shield, label: "Privacy Policy", color: "#6B7280" },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      className="w-full flex items-center gap-3 px-4 py-4"
                      style={{ borderBottom: i === 0 ? "1px solid #F3F4F6" : "none" }}
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: item.color + "15" }}>
                        <Icon className="w-4 h-4" style={{ color: item.color }} />
                      </div>
                      <span className="flex-1 text-left text-gray-900" style={{ fontSize: 13, fontWeight: 600 }}>
                        {item.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </button>
                  );
                })}
              </div>

              {/* Logout */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onLogout}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 bg-red-50 mb-6"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span className="text-red-500" style={{ fontSize: 14, fontWeight: 600 }}>Sign Out</span>
              </motion.button>
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="mt-4">
            <div className="bg-white rounded-3xl p-4 mb-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" fill="#F59E0B" />
                  <p className="text-gray-900" style={{ fontSize: 15, fontWeight: 700 }}>Produtos favoritos</p>
                </div>
                <button
                  type="button"
                  onClick={() => void onReloadFavorites()}
                  className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 flex items-center gap-1.5"
                  style={{ fontSize: 12, fontWeight: 600 }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Atualizar
                </button>
              </div>

              {favoritesLoading ? (
                <div className="flex items-center gap-2 text-gray-400 py-4">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>A carregar favoritos...</span>
                </div>
              ) : favoritesError ? (
                <div className="text-red-500 py-2" style={{ fontSize: 12, fontWeight: 600 }}>
                  {favoritesError}
                </div>
              ) : favoriteProducts.length === 0 ? (
                <div className="text-gray-400 py-4" style={{ fontSize: 13, fontWeight: 600 }}>
                  Ainda nao tens produtos favoritos.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {favoriteProducts.map((product) => {
                    const imageSrc = getProductImageSrc(product);

                    return (
                      <div key={product.id} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50">
                        <div className="w-11 h-11 rounded-xl bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
                          {imageSrc ? (
                            <ImageWithFallback src={imageSrc} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">{product.emoji || "P"}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-gray-900 truncate"
                            style={{ fontSize: 13, fontWeight: 700 }}
                          >
                            {product.name}
                          </p>
                          <p className="text-gray-400 truncate" style={{ fontSize: 11 }}>
                            ID: {product.id}
                          </p>
                        </div>
                        <Star className="w-4 h-4 text-amber-500" fill="#F59E0B" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
