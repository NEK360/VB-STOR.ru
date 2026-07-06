// ============================================================
// VB STORE — Email Module
// Поддерживает: EmailJS, Resend, SMTP, Nodemailer
// ============================================================

export interface OrderEmailData {
  customerName: string;
  customerPhone: string;
  customerTelegram?: string;
  productName: string;
  productId: string;
  size?: string;
  color?: string;
  comment?: string;
  timestamp: string;
}

// ---- EmailJS ----
// npm install @emailjs/browser
// import emailjs from "@emailjs/browser";
// const EMAILJS_SERVICE_ID = "service_xxx";
// const EMAILJS_TEMPLATE_ID = "template_xxx";
// const EMAILJS_PUBLIC_KEY = "xxx";

// ---- Resend ----
// API key: process.env.RESEND_API_KEY
// POST https://api.resend.com/emails

// ---- SMTP / Nodemailer ----
// Используется на бэкенде (Node.js сервер)

export const sendOrderEmail = async (data: OrderEmailData): Promise<boolean> => {
  try {
    // ---- EmailJS (раскомментируй для активации) ----
    // await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    //   to_email: "vbshop456@gmail.com",
    //   customer_name: data.customerName,
    //   customer_phone: data.customerPhone,
    //   product_name: data.productName,
    //   product_id: data.productId,
    //   size: data.size,
    //   color: data.color,
    //   comment: data.comment,
    //   timestamp: data.timestamp,
    // }, EMAILJS_PUBLIC_KEY);

    // ---- Resend (раскомментируй для активации) ----
    // const response = await fetch("https://api.resend.com/emails", {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     from: "VB STORE <noreply@vbstore.ru>",
    //     to: ["vbshop456@gmail.com"],
    //     subject: `Новая заявка: ${data.productName}`,
    //     html: `<h2>Новая заявка на товар</h2>
    //       <p><strong>Товар:</strong> ${data.productName} (${data.productId})</p>
    //       <p><strong>Имя:</strong> ${data.customerName}</p>
    //       <p><strong>Телефон:</strong> ${data.customerPhone}</p>
    //       <p><strong>Telegram:</strong> ${data.customerTelegram || "не указан"}</p>
    //       <p><strong>Размер:</strong> ${data.size || "не указан"}</p>
    //       <p><strong>Цвет:</strong> ${data.color || "не указан"}</p>
    //       <p><strong>Комментарий:</strong> ${data.comment || "нет"}</p>
    //       <p><strong>Время:</strong> ${data.timestamp}</p>`,
    //   }),
    // });
    // return response.ok;

    // Заглушка — пока email не подключён
    console.log("[Email] Order submitted (email not configured):", data);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send order:", error);
    return false;
  }
};
