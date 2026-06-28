import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoadingIntro from "@/components/LoadingIntro";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import PlayerDashboard from "./pages/PlayerDashboard";
import PlayerUpload from "./pages/PlayerUpload";
import PlayerExplore from "./pages/PlayerExplore";
import PlayerProfile from "./pages/PlayerProfile";
import ScoutDashboard from "./pages/ScoutDashboard";
import ScoutExplore from "./pages/ScoutExplore";
import ScoutSelections from "./pages/ScoutSelections";
import ScoutProfile from "./pages/ScoutProfile";
import PlayerResume from "./pages/PlayerResume";
import SafeScouting from "./pages/SafeScouting";
import Mission from "./pages/Mission";
import FAQ from "./pages/FAQ";
import AdminDashboard from "./pages/AdminDashboard";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const pageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.985 },
  animate: { 
    opacity: 1, y: 0, scale: 1, 
    transition: { duration: 0.45, ease: "easeOut" as const } 
  },
  exit: { 
    opacity: 0, y: -12, scale: 0.985, 
    transition: { duration: 0.28, ease: "easeIn" as const } 
  },
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ transformStyle: "preserve-3d", willChange: "transform, opacity" }}
        className="w-full"
      >
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/player" element={<ProtectedRoute allowedRoles={["player"]}><PlayerDashboard /></ProtectedRoute>} />
          <Route path="/player/upload" element={<ProtectedRoute allowedRoles={["player"]}><PlayerUpload /></ProtectedRoute>} />
          <Route path="/player/explore" element={<ProtectedRoute allowedRoles={["player"]}><PlayerExplore /></ProtectedRoute>} />
          <Route path="/player/profile" element={<ProtectedRoute allowedRoles={["player"]}><PlayerProfile /></ProtectedRoute>} />
          <Route path="/scout" element={<ProtectedRoute allowedRoles={["scout"]}><ScoutDashboard /></ProtectedRoute>} />
          <Route path="/scout/explore" element={<ProtectedRoute allowedRoles={["scout"]}><ScoutExplore /></ProtectedRoute>} />
          <Route path="/scout/selections" element={<ProtectedRoute allowedRoles={["scout"]}><ScoutSelections /></ProtectedRoute>} />
          <Route path="/scout/profile" element={<ProtectedRoute allowedRoles={["scout"]}><ScoutProfile /></ProtectedRoute>} />
          <Route path="/resume/:userId" element={<PlayerResume />} />
          <Route path="/safe-scouting" element={<SafeScouting />} />
          <Route path="/mission" element={<Mission />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => {
  const [showIntro, setShowIntro] = useState(() => !sessionStorage.getItem("introShown"));

  const handleIntroDone = () => {
    setShowIntro(false);
    sessionStorage.setItem("introShown", "1");
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {showIntro ? (
            <LoadingIntro onDone={handleIntroDone} />
          ) : (
            <BrowserRouter>
              <AuthProvider>
                <Navbar />
                <AnimatedRoutes />
                <MobileBottomNav />
              </AuthProvider>
            </BrowserRouter>
          )}
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
