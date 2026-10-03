import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Сайт работает на HashRouter (адреса вида /#/catalog/123). Если открыта «чистая»
// ссылка вида /catalog/123, переводим её в рабочий адрес без перезагрузки страницы —
// ссылка на товар в любом виде открывает именно эту карточку.
(function normalizeCleanUrl() {
  const { pathname, search, hash } = window.location;
  if (hash || pathname === "/" || pathname === "/index.html") return;
  if (/\.[a-z0-9]{2,5}$/i.test(pathname)) return; // обращения к файлам не трогаем
  window.history.replaceState(null, "", `/#${pathname}${search}`);
})();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
