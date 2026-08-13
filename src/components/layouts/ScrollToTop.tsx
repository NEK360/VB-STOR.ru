import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop — скроллит страницу вверх при навигации,
 * но НЕ трогает позицию при возврате назад (popstate).
 *
 * Это позволяет CatalogPage восстановить сохранённую позицию
 * после возврата с ProductPage.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  // Отслеживаем тип навигации: popstate = кнопка Назад/Вперёд
  const isPopState = useRef(false);

  useEffect(() => {
    const handlePopState = () => {
      isPopState.current = true;
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (isPopState.current) {
      // Возврат назад — не скроллим, CatalogPage сам восстановит позицию
      isPopState.current = false;
      return;
    }
    // Обычная навигация вперёд — скроллим наверх
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}
