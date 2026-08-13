import { useState } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import LoadingScreen from "./components/ui/LoadingScreen";
import CustomCursor from "./components/ui/CustomCursor";
import Header from "./components/layouts/Header";
import Footer from "./components/layouts/Footer";
import MobileNav from "./components/layouts/MobileNav";
import ScrollToTop from "./components/layouts/ScrollToTop";
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

// Backward-compatible redirect
function LegacyProductRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/catalog/${id ?? ""}`} replace />;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <>
      <ScrollToTop />
      <Header />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageWrapper>
                <HomePage />
              </PageWrapper>
            }
          />
          <Route
            path="/catalog"
            element={
              <PageWrapper>
                <CatalogPage />
              </PageWrapper>
            }
          />
          <Route
            path="/catalog/:id"
            element={
              <PageWrapper>
                <ProductPage />
              </PageWrapper>
            }
          />
          <Route
            path="/product/:id"
            element={<LegacyProductRedirect />}
          />
          <Route
            path="/sale"
            element={
              <PageWrapper>
                <SalePage />
              </PageWrapper>
            }
          />
          <Route
            path="/reviews"
            element={
              <PageWrapper>
                <ReviewsPage />
              </PageWrapper>
            }
          />
          <Route
            path="/contacts"
            element={
              <PageWrapper>
                <ContactsPage />
              </PageWrapper>
            }
          />
          <Route
            path="/faq"
            element={
              <PageWrapper>
                <FAQPage />
              </PageWrapper>
            }
          />
          <Route
            path="/favorites"
            element={
              <PageWrapper>
                <FavoritesPage />
              </PageWrapper>
            }
          />
          <Route
            path="*"
            element={
              <PageWrapper>
                <main className="min-h-screen pt-20 flex items-center justify-center">
                  <div className="text-center px-4">
                    <p
                      className="text-white/10 font-black"
                      style={{ fontSize: "clamp(4rem, 20vw, 12rem)" }}
                    >
                      404
                    </p>
                    <p className="text-white/40 text-xl mb-2">
                      Страница не найдена
                    </p>
                    <p className="text-white/20 text-sm mb-10">
                      Возможно, вы перешли по неверной ссылке
                    </p>
                    <a
                      href="#/"
                      className="inline-flex items-center gap-2 bg-white text-black font-semibold px-8 py-4 rounded-2xl hover:bg-white/90 transition-all"
                    >
                      На главную
                    </a>
                  </div>
                </main>
              </PageWrapper>
            }
          />
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
    <HashRouter>
      <CustomCursor />
      {!loaded && <LoadingScreen onComplete={() => setLoaded(true)} />}
      <div className="min-h-screen bg-black text-white">
        <AppRoutes />
      </div>
    </HashRouter>
  );
}
