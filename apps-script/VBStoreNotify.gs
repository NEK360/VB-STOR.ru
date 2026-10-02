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

  /** order — заказ в формате сайта, itemsText — готовый многострочный список товаров. */
  function newOrder(order, itemsText) {
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
      'Оплата: ' + PAYMENT[order.paymentMethod],
      'Статус: ' + order.status
    ].filter(function (line) { return line !== null; });

    MailApp.sendEmail({
      to: OWNER_EMAIL,
      subject: 'VB STORE: новый заказ №' + order.orderId + ' на ' + formatMoney_(order.total),
      body: lines.join('\n')
    });
  }

  return { newOrder: newOrder };
})();
