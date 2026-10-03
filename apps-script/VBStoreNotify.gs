/**
 * VB STORE — необязательное уведомление о новом заказе на почту.
 *
 * Добавляйте этот файл в проект Apps Script, ТОЛЬКО если хотите получать письмо
 * при каждом новом заказе. Без него заказы так же сохраняются в лист ORDERS —
 * просто письма не будет.
 *
 * При первом запуске Google попросит дополнительное разрешение «Отправка писем
 * от вашего имени» — это нужно только для этой функции.
 */
var VBStoreNotify = (function () {
  'use strict';

  // Куда отправлять уведомления (по умолчанию — почта магазина с сайта)
  var OWNER_EMAIL = 'vbshop456@gmail.com';

  var DELIVERY = { pickup: 'Пункт выдачи', russia: 'Доставка по России' };
  var PAYMENT = { prepaid: 'Сразу', on_receipt: 'При получении' };

  function formatMoney_(value) {
    return String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
  }

  /**
   * order — заказ в формате сайта, itemsText — готовый многострочный список товаров,
   * where — куда записан заказ в таблице: { sheet, row, spreadsheet, url } (необязательно).
   */
  function newOrder(order, itemsText, where) {
    if (!OWNER_EMAIL) return;

    var timeZone = Session.getScriptTimeZone();
    var created = Utilities.formatDate(new Date(order.createdAt), timeZone, 'dd.MM.yyyy HH:mm');

    var lines = [
      'Новый заказ №' + order.orderId,
      'Дата: ' + created,
      'Телефон: ' + order.userPhone,
      '',
      'Товары:',
      itemsText,
      '',
      order.discount > 0
        ? 'Цена товаров: ' + formatMoney_(order.subtotal) + '\nСкидка (промокод ' + order.promoCode + '): -' + formatMoney_(order.discount)
        : null,
      'Итого: ' + formatMoney_(order.total),
      '',
      'Доставка: ' + DELIVERY[order.deliveryType] +
        (order.pickupAddress ? ' — ' + order.pickupAddress : '') +
        (order.deliveryService ? ' — ' + order.deliveryService : ''),
      order.deliveryPrice
        ? 'Стоимость доставки: ' + order.deliveryPrice +
          (order.deliveryType === 'russia' ? ' (в итог не входит; точную сумму подтвердить с покупателем)' : '')
        : null,
      'Оплата: ' + PAYMENT[order.paymentMethod],
      'Статус: ' + order.status
    ].filter(function (line) { return line !== null; });

    if (where && where.sheet) {
      lines.push(
        '',
        'Запись в таблице: лист «' + where.sheet + '», строка ' + where.row +
          (where.spreadsheet ? ' (таблица «' + where.spreadsheet + '»)' : '')
      );
      if (where.url) lines.push(where.url);
    }

    MailApp.sendEmail({
      to: OWNER_EMAIL,
      subject: 'VB STORE: новый заказ №' + order.orderId + ' на ' + formatMoney_(order.total),
      body: lines.join('\n')
    });
  }

  /** Тестовое письмо: проверяет адрес и (при первом запуске) выдаёт разрешение на отправку почты. */
  function test() {
    newOrder({
      orderId: 'ТЕСТ',
      createdAt: new Date().toISOString(),
      userPhone: '+79180000000',
      subtotal: 1000,
      discount: 50,
      promoCode: 'VB5',
      total: 950,
      deliveryType: 'pickup',
      deliveryService: null,
      pickupAddress: 'г. Изобильный, Улица Кирова 2а',
      paymentMethod: 'on_receipt',
      deliveryPrice: 'Бесплатно',
      status: 'Новый'
    }, '1. Пример товара, размер 42 × 1 = 1000 ₽');
    return 'Тестовое письмо отправлено на ' + OWNER_EMAIL + '. Проверьте почту (и папку «Спам»).';
  }

  return { newOrder: newOrder, test: test };
})();

/**
 * Запустите вручную ОДИН РАЗ (кнопка «Выполнить»): Google попросит разрешение на отправку писем, затем придёт
 * тестовое письмо. Без этого разрешения письма о заказах не отправляются (а сам заказ сохраняется).
 * После этого опубликуйте новую версию веб-приложения.
 */
function vbStoreNotifyTest() {
  var message = VBStoreNotify.test();
  Logger.log(message);
  return message;
}
