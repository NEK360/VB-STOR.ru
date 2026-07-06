import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import LoadingScreen from "./components/ui/LoadingScreen";
import CustomCursor from "./components/ui/CustomCursor";
import Header from "./components/layouts/Header";
import Footer from "./components/layouts/Footer";
import MobileNav from "./components/layouts/MobileNav";

import HomePage from "./pages/HomePage";
import CatalogPage from "./pages/CatalogPage";
import ProductPage from "./pages/ProductPage";
import SalePage from "./pages/SalePage";
import ReviewsPage from "./pages/ReviewsPage";
import ContactsPage from "./pages/ContactsPage";
import FAQPage from "./pages/FAQPage";
import FavoritesPage from "./pages/FavoritesPage";

// Page transition wrapper
function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

// Scroll to top on navigation
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <>
      <ScrollToTop />
      <Header />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
          <Route path="/catalog" element={<PageWrapper><CatalogPage /></PageWrapper>} />
          <Route path="/catalog/:id" element={<PageWrapper><ProductPage /></PageWrapper>} />
          <Route path="/sale" element={<PageWrapper><SalePage /></PageWrapper>} />
          <Route path="/reviews" element={<PageWrapper><ReviewsPage /></PageWrapper>} />
          <Route path="/contacts" element={<PageWrapper><ContactsPage /></PageWrapper>} />
          <Route path="/faq" element={<PageWrapper><FAQPage /></PageWrapper>} />
          <Route path="/favorites" element={<PageWrapper><FavoritesPage /></PageWrapper>} />
          <Route path="*" element={
            <PageWrapper>
              <main className="min-h-screen pt-20 flex items-center justify-center">
                <div className="text-center px-4">
                  <p className="text-white/10 font-black" style={{ fontSize: "clamp(4rem, 20vw, 12rem)" }}>404</p>
                  <p className="text-white/40 text-xl mb-2">Страница не найдена</p>
                  <p className="text-white/20 text-sm mb-10">Возможно, вы перешли по неверной ссылке</p>
                  <a href="/" className="inline-flex items-center gap-2 bg-white text-black font-semibold px-8 py-4 rounded-2xl hover:bg-white/90 transition-all">
                    На главную
                  </a>
                </div>
              </main>
            </PageWrapper>
          } />
        </Routes>
      </AnimatePresence>
      <Footer />
      <MobileNav />
    </>
  );
}

export default function App() {
  const [loaded, setLoaded] = useState(false);

  return (
    <BrowserRouter>
      <CustomCursor />
      {!loaded && <LoadingScreen onComplete={() => setLoaded(true)} />}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        {loaded && <AppRoutes />}
      </motion.div>
    </BrowserRouter>
  );
}
