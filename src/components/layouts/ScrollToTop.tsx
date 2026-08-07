import { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

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
