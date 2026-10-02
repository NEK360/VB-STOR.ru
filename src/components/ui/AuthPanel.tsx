import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { getErrorMessage } from "../../lib/backend";
import { loginUser, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH, registerUser } from "../../lib/auth";
import { isValidPhone } from "../../lib/phone";
import { toast } from "../../lib/toast";
import PhoneInput from "./PhoneInput";

export type AuthTab = "login" | "register";

interface AuthPanelProps {
  /** Вызывается после успешного входа или регистрации (пользователь уже авторизован) */
  onSuccess?: () => void;
  initialTab?: AuthTab;
}

interface FieldErrors {
  phone?: string;
  password?: string;
  confirm?: string;
}

const inputClass = (invalid: boolean) =>
  `w-full rounded-xl border bg-white/5 px-4 py-3.5 text-base text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/30 ${
    invalid ? "border-rose-400/70" : "border-white/10"
  }`;

/**
 * Вход и регистрация (телефон + пароль).
 * Используется на странице профиля и прямо в оформлении заказа — пользователь
 * не теряет выбранные товары: после входа оформление продолжается на той же странице.
 */
export default function AuthPanel({ onSuccess, initialTab = "login" }: AuthPanelProps) {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isRegister = tab === "register";

  const switchTab = (next: AuthTab) => {
    if (next === tab) return;
    setTab(next);
    setErrors({});
    setSubmitError("");
    setConfirm("");
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};

    if (!phone.trim()) next.phone = "Введите номер телефона";
    else if (!isValidPhone(phone)) {
      next.phone = "Введите корректный номер, например +7 (918) 123-45-67";
    }

    if (!password) next.password = "Введите пароль";
    else if (isRegister && password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Пароль должен содержать не менее ${MIN_PASSWORD_LENGTH} символов`;
    } else if (password.length > MAX_PASSWORD_LENGTH) {
      next.password = `Пароль слишком длинный (максимум ${MAX_PASSWORD_LENGTH} символов)`;
    }

    if (isRegister) {
      if (!confirm) next.confirm = "Повторите пароль";
      else if (confirm !== password) next.confirm = "Пароли не совпадают";
    }

    return next;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const fieldErrors = validate();
    setErrors(fieldErrors);
    setSubmitError("");
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    try {
      if (isRegister) {
        await registerUser(phone, password);
        toast.success("Вы зарегистрированы и вошли в аккаунт");
      } else {
        await loginUser(phone, password);
        toast.success("Вы вошли в аккаунт");
      }
      setPassword("");
      setConfirm("");
      onSuccess?.();
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass rounded-3xl p-5 sm:p-6">
      <div
        className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-white/6 p-1"
        role="tablist"
        aria-label="Вход или регистрация"
      >
        {(
          [
            ["login", "Войти"],
            ["register", "Регистрация"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => switchTab(id)}
            className={`rounded-lg py-2.5 text-sm font-semibold transition-all ${
              tab === id ? "bg-white text-black" : "text-white/50 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div>
          <label htmlFor="auth-phone" className="mb-1.5 block text-xs text-white/50">
            Номер телефона
          </label>
          <PhoneInput
            id="auth-phone"
            value={phone}
            onChange={(value) => {
              setPhone(value);
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            invalid={Boolean(errors.phone)}
            describedBy={errors.phone ? "auth-phone-error" : undefined}
          />
          {errors.phone && (
            <p id="auth-phone-error" role="alert" className="mt-1.5 text-sm text-rose-400">
              {errors.phone}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="auth-password" className="mb-1.5 block text-xs text-white/50">
            Пароль
          </label>
          <div className="relative">
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder={isRegister ? `Не менее ${MIN_PASSWORD_LENGTH} символов` : "Введите пароль"}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "auth-password-error" : undefined}
              className={`${inputClass(Boolean(errors.password))} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-white/40 transition-colors hover:text-white"
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p id="auth-password-error" role="alert" className="mt-1.5 text-sm text-rose-400">
              {errors.password}
            </p>
          )}
        </div>

        {isRegister && (
          <div>
            <label htmlFor="auth-confirm" className="mb-1.5 block text-xs text-white/50">
              Подтвердите пароль
            </label>
            <input
              id="auth-confirm"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(event) => {
                setConfirm(event.target.value);
                if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: undefined }));
              }}
              autoComplete="new-password"
              placeholder="Повторите пароль"
              aria-invalid={Boolean(errors.confirm)}
              aria-describedby={errors.confirm ? "auth-confirm-error" : undefined}
              className={inputClass(Boolean(errors.confirm))}
            />
            {errors.confirm && (
              <p id="auth-confirm-error" role="alert" className="mt-1.5 text-sm text-rose-400">
                {errors.confirm}
              </p>
            )}
          </div>
        )}

        {submitError && (
          <p
            role="alert"
            className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm leading-snug text-rose-300"
          >
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <LoaderCircle size={16} className="animate-spin" />
              {isRegister ? "Регистрируем…" : "Входим…"}
            </>
          ) : isRegister ? (
            "Зарегистрироваться"
          ) : (
            "Войти"
          )}
        </button>

        <p className="text-center text-xs leading-relaxed text-white/30">
          Номер нужен, чтобы мы могли связаться с вами по заказу. Пароль нигде не хранится в
          открытом виде.
        </p>
      </form>
    </div>
  );
}
