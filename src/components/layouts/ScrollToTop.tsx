import { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

/**
 * Scrolls the window to the top on route changes, except when navigating
 * to the reviews page with a `review` query param — in that case the
 * ReviewsPage itself handles scrolling to the highlighted review.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (pathname === "/reviews" && searchParams.get("review")) {
      return;
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, searchParams]);

  return null;
}
