import { maskPhoneInput } from "../../lib/phone";

interface PhoneInputProps {
  id: string;
  value: string;
  onChange: (maskedValue: string) => void;
  invalid?: boolean;
  describedBy?: string;
}

/** Поле телефона с маской +7 (___) ___-__-__. Понимает ввод и вставку в любом привычном формате. */
export default function PhoneInput({ id, value, onChange, invalid, describedBy }: PhoneInputProps) {
  return (
    <input
      id={id}
      type="tel"
      inputMode="tel"
      autoComplete="username"
      placeholder="+7 (___) ___-__-__"
      value={value}
      onChange={(event) => onChange(maskPhoneInput(event.target.value, value))}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      className={`w-full rounded-xl border bg-white/5 px-4 py-3.5 text-base text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/30 ${
        invalid ? "border-rose-400/70" : "border-white/10"
      }`}
    />
  );
}
