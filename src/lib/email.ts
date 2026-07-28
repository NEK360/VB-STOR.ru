import emailjs from "@emailjs/browser";

export interface OrderEmailData {
  customerName: string;
  customerPhone: string;
  customerTelegram?: string;

  productName: string;
  productId: string;

  productUrl?: string;
  productImage?: string;

  size?: string;
  color?: string;

  comment?: string;
  timestamp: string;

  price?: number;
  promocode?: string;
  discount?: number;
  finalPrice?: number;
}

const SERVICE_ID = "service_1qu8r27";
const TEMPLATE_ID = "template_gb4yx1i";
const PUBLIC_KEY = "mqxDc8EvOsTGdp-A8";

export async function sendOrderEmail(
  data: OrderEmailData
): Promise<boolean> {
  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
     {
  to_email: "vbshop456@gmail.com",

  name: String(data.customerName || "Не указано"),
  phone: String(data.customerPhone || "Не указан"),
  telegram: String(data.customerTelegram || "Не указан"),

  product: String(data.productName || "Не указан"),

product_url: String(data.productUrl || ""),
product_image: String(data.productImage || ""),

size: String(data.size || "Не выбран"),
color: String(data.color || "Не выбран"),

  price: String(data.finalPrice ?? data.price ?? 0),
  promocode: String(data.promocode || "Нет"),

  comment: String(data.comment || "Без комментария"),

  timestamp: data.timestamp,
},
      PUBLIC_KEY
    );

    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}
