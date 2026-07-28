import emailjs from "@emailjs/browser";

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

  name: data.customerName,
  phone: data.customerPhone,
  telegram: data.customerTelegram || "Не указан",

  product: data.productName,

  size: data.size || "Не выбран",
  color: data.color || "Не выбран",

  price: data.finalPrice ?? data.price ?? 0,
  promocode: data.promocode || "Нет",

  comment: data.comment || "Без комментария",

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
