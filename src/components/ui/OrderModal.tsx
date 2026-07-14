import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Send, Check, Loader, Phone } from "lucide-react";
import { type Product } from "../../lib/api";
import { contacts } from "../../store-data/contacts";
import { sendOrderEmail } from "../../lib/email";
import { analytics } from "../../lib/analytics";
import { sanitizeInput, validatePhone } from "../../lib/utils";

interface OrderModalProps {
  product: Product | null;
  selectedSize?: string;
  selectedColor?: string;
  isOpen: boolean;
  onClose: () => void;
}

type Status = "idle" | "loading" | "success" | "error";

export default function OrderModal({ product, selectedSize, selectedColor, isOpen, onClose }: OrderModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [telegram, setTelegram] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Введите ваше имя";
    if (!phone.trim()) e.phone = "Введите номер телефона";
    else if (!validatePhone(phone)) e.phone = "Введите корректный номер";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    if (!product) return;

    setStatus("loading");
    setErrors({});

    try {
      const success = await sendOrderEmail({
        customerName: sanitizeInput(name),
        customerPhone: sanitizeInput(phone),
        customerTelegram: telegram ? sanitizeInput(telegram) : undefined,
        productName: product.name,
        productId: product.id,
        size: selectedSize,
        color: selectedColor,
        comment: comment ? sanitizeInput(comment) : undefined,
        timestamp: new Date().toLocaleString("ru-RU"),
      });

      if (success) {
        setStatus("success");
        analytics.submitOrder(product.id, product.name, product.price);
        setTimeout(() => {
          onClose();
          setStatus("idle");
          setName(""); setPhone(""); setTelegram(""); setComment("");
        }, 3000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (!product) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />

          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative w-full sm:max-w-md glass rounded-t-3xl sm:rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="sm:hidden w-10 h-1 rounded-full bg-white/20 mx-auto mt-3" />

            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-white font-bold text-lg">Оставить заявку</h2>
                  <p className="text-white/40 text-sm mt-1 line-clamp-1">{product.name}</p>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              {status === "success" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                    <Check size={28} className="text-emerald-400" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">Заявка отправлена!</h3>
                  <p className="text-white/50 text-sm">Мы свяжемся с вами в ближайшее время</p>
                </motion.div>
              ) : (
                <>
                  {/* Quick contact buttons */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <a
                      href={`${contacts.whatsappUrl}?text=Хочу заказать: ${product.name}${selectedSize ? `, размер ${selectedSize}` : ""}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600/20 border border-green-600/30 text-green-400 text-sm hover:bg-green-600/30 transition-all"
                      onClick={() => analytics.clickContact("whatsapp")}
                    >
                      <MessageCircle size={16} />
                      WhatsApp
                    </a>
                    <a
                      href={`${contacts.telegramUrl}?text=Хочу заказать: ${product.name}${selectedSize ? `, размер ${selectedSize}` : ""}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600/20 border border-blue-600/30 text-blue-400 text-sm hover:bg-blue-600/30 transition-all"
                      onClick={() => analytics.clickContact("telegram")}
                    >
                      <Send size={16} />
                      Telegram
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <a
                      href={contacts.maxUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600/20 border border-purple-600/30 text-purple-400 text-sm hover:bg-purple-600/30 transition-all"
                      onClick={() => analytics.clickContact("max")}
                    >
                      <MessageCircle size={16} />
                      MAX
                    </a>
                    <a
                      href={`tel:${contacts.phoneClean}`}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white/80 text-sm hover:bg-white/20 transition-all"
                    >
                      <Phone size={16} />
                      Позвонить
                    </a>
                  </div>

                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-white/8" />
                    <span className="text-white/25 text-xs">или заполните форму</span>
                    <div className="flex-1 h-px bg-white/8" />
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                    <div>
                      <label className="text-white/50 text-xs mb-1.5 block" htmlFor="order-name">Ваше имя *</label>
                      <input
                        id="order-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Иван"
                        className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 outline-none transition-all focus:border-white/30 ${errors.name ? "border-red-500/60" : "border-white/10"}`}
                        aria-required="true"
                        aria-invalid={!!errors.name}
                        aria-describedby={errors.name ? "name-error" : undefined}
                      />
                      {errors.name && <p id="name-error" className="text-red-400 text-xs mt-1" role="alert">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="text-white/50 text-xs mb-1.5 block" htmlFor="order-phone">Телефон *</label>
                      <input
                        id="order-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+7 900 000-00-00"
                        className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 outline-none transition-all focus:border-white/30 ${errors.phone ? "border-red-500/60" : "border-white/10"}`}
                        aria-required="true"
                        aria-invalid={!!errors.phone}
                        aria-describedby={errors.phone ? "phone-error" : undefined}
                      />
                      {errors.phone && <p id="phone-error" className="text-red-400 text-xs mt-1" role="alert">{errors.phone}</p>}
                    </div>
                    <div>
                      <label className="text-white/50 text-xs mb-1.5 block" htmlFor="order-telegram">Telegram (необязательно)</label>
                      <input
                        id="order-telegram"
                        type="text"
                        value={telegram}
                        onChange={(e) => setTelegram(e.target.value)}
                        placeholder="@username"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 outline-none transition-all focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="text-white/50 text-xs mb-1.5 block" htmlFor="order-comment">Комментарий</label>
                      <textarea
                        id="order-comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={`Товар: ${product.name}${selectedSize ? `\nРазмер: ${selectedSize}` : ""}`}
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 outline-none transition-all focus:border-white/30 resize-none"
                      />
                    </div>

                    {status === "error" && (
                      <p className="text-red-400 text-sm text-center" role="alert">
                        Ошибка отправки. Напишите нам напрямую.
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {status === "loading" ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Отправка...
                        </>
                      ) : (
                        "Отправить заявку"
                      )}
                    </button>

                    <p className="text-white/20 text-xs text-center">
                      Нажимая кнопку, вы соглашаетесь на обработку персональных данных
                    </p>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
