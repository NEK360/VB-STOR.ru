const API_URL =
  "https://script.google.com/macros/s/AKfycbzjrIaEGBIaQtD67GKYfi712ZN5c2VILKYrmEyIONMOK_W2cWr4IudBrmzEMc3wb9U82w/exec";

export async function loadProducts() {
  const res = await fetch(
    `${API_URL}?action=catalog`
  );

  if (!res.ok) {
    throw new Error("Ошибка загрузки каталога");
  }

  return await res.json();
}