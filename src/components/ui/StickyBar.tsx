import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Закреплённая нижняя панель («Итого» + кнопка) для корзины и оформления заказа.
 *
 *  - стоит ВЫШЕ нижней навигации (её высоту MobileNav пишет в --vb-mobile-nav-h),
 *    поэтому ничего не перекрывает;
 *  - рисуется через portal: анимация перехода страницы (transform) не сдвигает
 *    fixed-элементы внутри себя;
 *  - z-[80] — ниже шапки/навигации/мобильного меню (90–100), выше обычного контента;
 *  - на широких экранах (lg+) не показывается: там «Итого» лежит в боковой карточке.
 */
export default function StickyBar({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      data-sticky-bar
      className="fixed inset-x-0 bottom-[var(--vb-mobile-nav-h,0px)] z-[80] border-t border-white/10 bg-black/90 backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">{children}</div>
    </div>,
    document.body
  );
}
