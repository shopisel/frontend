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

type AppFlow = "splash" | "onboarding" | "auth" | "app";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function AppLayout({ onLogout, user }: { onLogout: () => void; user?: { name?: string; email?: string; username?: string } | null }) {
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
                  <PricesScreen />
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
                  <ProfileScreen onLogout={onLogout} user={user} />
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
  const [flow, setFlow] = useState<AppFlow>("splash");
  const [authLoading, setAuthLoading] = useState(false);

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
            <AppLayout onLogout={() => { void handleKeycloakLogout(); }} user={user} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
