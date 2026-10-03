import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** При смене значения (например, адреса страницы) ошибка сбрасывается */
  resetKey?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Страховка от «белого экрана»: если на странице произошла непредвиденная
 * ошибка, пользователь увидит понятное сообщение, а не пустой экран.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Ошибка интерфейса:", error, info.componentStack);
  }

  componentDidUpdate(previous: ErrorBoundaryProps) {
    if (this.state.hasError && previous.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center px-4 pb-32 pt-24">
        <div className="max-w-sm text-center">
          <p className="mb-2 text-xl font-bold text-white">Что-то пошло не так</p>
          <p className="mb-6 text-sm text-white/40">
            Страница не открылась. Попробуйте обновить её или вернуться на главную.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition-colors hover:bg-white/90"
            >
              Обновить страницу
            </button>
            <Link
              to="/"
              className="rounded-2xl border border-white/15 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/8"
            >
              На главную
            </Link>
          </div>
        </div>
      </main>
    );
  }
}
