/**
 * YORK! — зеркало заявок на пробный урок в Google Sheets.
 *
 * Как подключить:
 * 1. Открой (или создай) Google-таблицу, куда должны падать заявки.
 * 2. В таблице: Расширения → Apps Script.
 * 3. Сотри весь шаблонный код, вставь этот файл целиком.
 * 4. Наверху справа — «Развернуть» → «Новое развёртывание».
 *    Тип — «Веб-приложение». Кто имеет доступ — «Все».
 * 5. Разверни, скопируй появившийся URL (заканчивается на /exec).
 * 6. В Supabase: Database → Webhooks → Create a new hook
 *    - Table: trial_requests
 *    - Events: Insert
 *    - Type: HTTP Request
 *    - URL: тот самый /exec адрес
 *    - Method: POST
 * Готово — с этого момента каждая новая заявка на пробный будет
 * сама появляться новой строкой в этой таблице.
 */

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // при первом запуске — добавляем заголовки, если их ещё нет
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Дата', 'Имя', 'Контакт', 'Возраст', 'Откуда узнали',
      'Уровень', 'Цель', 'Дни', 'Время', 'Часовой пояс', 'Комментарий', 'Статус'
    ]);
  }

  try {
    const body = JSON.parse(e.postData.contents);
    const record = body.record || body; // Supabase присылает { type, table, record, ... }

    sheet.appendRow([
      new Date(),
      record.full_name || '',
      record.contact || '',
      record.age || '',
      record.source || '',
      record.current_level || '',
      record.goal || '',
      record.preferred_days || '',
      record.preferred_time || '',
      record.preferred_timezone || '',
      record.comment || '',
      record.status || ''
    ]);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
