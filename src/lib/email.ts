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

        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        customer_telegram: data.customerTelegram || "Не указан",

        product_name: data.productName,
        product_id: data.productId,

        size: data.size || "Не выбран",
        color: data.color || "Не выбран",

        price: data.price ?? "",
        promocode: data.promocode || "Нет",
        discount: data.discount ? `${data.discount}%` : "0%",
        final_price: data.finalPrice ?? data.price,

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
    // Заглушка — пока email не подключён
    console.log("[Email] Order submitted (email not configured):", data);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send order:", error);
    return false;
  }
};
