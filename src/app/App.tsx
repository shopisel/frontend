import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { SplashScreen } from "./components/screens/SplashScreen";
import { OnboardingScreen } from "./components/screens/OnboardingScreen";
import { HomeScreen } from "./components/screens/HomeScreen";
import { ListsScreen } from "./components/screens/ListsScreen";
import { ListScreen } from "./components/screens/ListScreen";
import { PricesScreen } from "./components/screens/PricesScreen";
import { AlertsScreen } from "./components/screens/AlertsScreen";
import { ProfileScreen } from "./components/screens/ProfileScreen";
import { Sidebar } from "./components/layout/Sidebar";
import { useAuth } from "../auth/AuthProvider";
import { useAccounts } from "../api/useAccounts";
import { useProducts, type Product } from "../api/useProducts";

type AppFlow = "splash" | "onboarding" | "auth" | "app";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function AppLayout({
  onLogout,
  user,
  favoriteProductIds,
  favoriteProducts,
  favoritesLoading,
  favoritesError,
  onToggleFavorite,
  onReloadFavorites,
}: {
  onLogout: () => void;
  user?: { name?: string; email?: string; username?: string } | null;
  favoriteProductIds: string[];
  favoriteProducts: Product[];
  favoritesLoading: boolean;
  favoritesError: string | null;
  onToggleFavorite: (product: Product) => Promise<void>;
  onReloadFavorites: () => Promise<void>;
}) {
  const navigate = useNavigate();

  const handleNavigate = useCallback(
    (tab: string) => {
      const routeMap: Record<string, string> = {
        home: "/",
        lists: "/lists",
        prices: "/prices",
        alerts: "/alerts",
        profile: "/profile",
      };
      navigate(routeMap[tab] ?? "/");
    },
    [navigate]
  );

  return (
    <div className="flex h-screen bg-[#F8F9FC] overflow-hidden">
      <Sidebar onLogout={onLogout} alertCount={5} />

      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <Routes>
            <Route
              path="/"
              element={
                <motion.div key="home" className="h-full" {...pageVariants} transition={{ duration: 0.2 }}>
                  <HomeScreen onNavigate={handleNavigate} user ={user} />
                </motion.div>
              }
            />
            <Route
              path="/lists"
              element={
                <motion.div key="lists" className="h-full" {...pageVariants} transition={{ duration: 0.2 }}>
                  <ListsScreen onNavigate={handleNavigate} />
                </motion.div>
              }
            />
            <Route
              path="/lists/:listId"
              element={
                <motion.div key="list-detail" className="h-full" {...pageVariants} transition={{ duration: 0.2 }}>
                  <ListScreen onNavigate={handleNavigate} />
                </motion.div>
              }
            />
            <Route
              path="/prices"
              element={
                <motion.div key="prices" className="h-full" {...pageVariants} transition={{ duration: 0.2 }}>
                  <PricesScreen
                    favoriteProductIds={favoriteProductIds}
                    onToggleFavorite={onToggleFavorite}
                  />
                </motion.div>
              }
            />
            <Route
              path="/alerts"
              element={
                <motion.div key="alerts" className="h-full" {...pageVariants} transition={{ duration: 0.2 }}>
                  <AlertsScreen />
                </motion.div>
              }
            />
            <Route
              path="/profile"
              element={
                <motion.div key="profile" className="h-full" {...pageVariants} transition={{ duration: 0.2 }}>
                  <ProfileScreen
                    onLogout={onLogout}
                    user={user}
                    favoriteProducts={favoriteProducts}
                    favoritesLoading={favoritesLoading}
                    favoritesError={favoritesError}
                    onReloadFavorites={onReloadFavorites}
                  />
                </motion.div>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  const { initialized, isAuthenticated, login, register, logout, configError, user } = useAuth();
  const { syncMyAccount, getMyFavoriteProductIds, addFavoriteProduct, removeFavoriteProduct } = useAccounts();
  const { getProductsByIds } = useProducts();
  const [flow, setFlow] = useState<AppFlow>("splash");
  const [authLoading, setAuthLoading] = useState(false);
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) return;
    if (isAuthenticated) {
      setFlow("app");
      return;
    }
    if (flow === "app") {
      setFlow("auth");
    }
  }, [initialized, isAuthenticated, flow]);

  const handleSplashComplete = useCallback(() => {
    if (isAuthenticated) {
      setFlow("app");
      return;
    }
    setFlow("onboarding");
  }, [isAuthenticated]);

  const handleOnboardingComplete = useCallback(async () => {
    if (isAuthenticated) {
      setFlow("app");
      return;
    }

    setAuthLoading(true);
    try {
      await login(); 
    } finally {
      setAuthLoading(false);
    }
  }, [isAuthenticated, login]);

  const handleKeycloakLogin = useCallback(async () => {
    setAuthLoading(true);
    try {
      await login();
    } finally {
      setAuthLoading(false);
    }
  }, [login]);

  const handleKeycloakLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      setFlow("auth");
    }
  }, [logout]);

  const handleKeycloakRegister = useCallback(async () => {
    setAuthLoading(true);
    try {
      await register();
    } finally {
      setAuthLoading(false);
    }
  }, [register]);

  const loadFavorites = useCallback(async () => {
    if (!isAuthenticated) return;

    setFavoritesLoading(true);
    setFavoritesError(null);

    try {
      const ids = await getMyFavoriteProductIds();
      setFavoriteProductIds(ids);

      if (!ids.length) {
        setFavoriteProducts([]);
        return;
      }

      const products = await getProductsByIds(ids);
      const productById = new Map(products.map((product) => [product.id, product] as const));
      const orderedProducts = ids.map((id) => productById.get(id)).filter((product): product is Product => Boolean(product));
      setFavoriteProducts(orderedProducts);
    } catch (error) {
      setFavoritesError(error instanceof Error ? error.message : "Falha ao carregar favoritos.");
    } finally {
      setFavoritesLoading(false);
    }
  }, [isAuthenticated, getMyFavoriteProductIds, getProductsByIds]);

  useEffect(() => {
    if (!initialized || !isAuthenticated) {
      setFavoriteProductIds([]);
      setFavoriteProducts([]);
      setFavoritesError(null);
      setFavoritesLoading(false);
      return;
    }

    let cancelled = false;

    const initializeAccount = async () => {
      try {
        await syncMyAccount();
      } catch {
        // Continue loading favorites even if sync fails once.
      }

      if (cancelled) return;
      await loadFavorites();
    };

    void initializeAccount();

    return () => {
      cancelled = true;
    };
  }, [initialized, isAuthenticated, syncMyAccount, loadFavorites]);

  const handleToggleFavorite = useCallback(
    async (product: Product) => {
      const alreadyFavorite = favoriteProductIds.includes(product.id);
      const previousIds = favoriteProductIds;
      const previousProducts = favoriteProducts;

      setFavoritesError(null);

      if (alreadyFavorite) {
        setFavoriteProductIds((prev) => prev.filter((id) => id !== product.id));
        setFavoriteProducts((prev) => prev.filter((item) => item.id !== product.id));
      } else {
        setFavoriteProductIds((prev) => [...prev, product.id]);
        setFavoriteProducts((prev) => (prev.some((item) => item.id === product.id) ? prev : [product, ...prev]));
      }

      try {
        if (alreadyFavorite) {
          await removeFavoriteProduct(product.id);
        } else {
          await addFavoriteProduct(product.id);
        }
      } catch (error) {
        setFavoriteProductIds(previousIds);
        setFavoriteProducts(previousProducts);
        setFavoritesError(error instanceof Error ? error.message : "Falha ao atualizar favoritos.");
      }
    },
    [favoriteProductIds, favoriteProducts, addFavoriteProduct, removeFavoriteProduct]
  );

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {flow === "splash" && (
          <motion.div
            key="splash"
            className="fixed inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <SplashScreen onComplete={handleSplashComplete} />
          </motion.div>
        )}

        {flow === "onboarding" && (
          <motion.div
            key="onboarding"
            className="fixed inset-0"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <OnboardingScreen onComplete={handleOnboardingComplete} />
          </motion.div>
        )}
        
        {flow === "app" && (
          <motion.div
            key="app"
            className="fixed inset-0"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <AppLayout
              onLogout={() => {
                void handleKeycloakLogout();
              }}
              user={user}
              favoriteProductIds={favoriteProductIds}
              favoriteProducts={favoriteProducts}
              favoritesLoading={favoritesLoading}
              favoritesError={favoritesError}
              onToggleFavorite={handleToggleFavorite}
              onReloadFavorites={loadFavorites}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
