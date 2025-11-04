# SETTERS · Resource Management & Forecasting Dashboard (Mock)

Next.js 14 (App Router, TypeScript) + Tailwind + recharts + framer-motion + xlsx.

## Быстрый старт

```bash
pnpm i   # или npm i / yarn
pnpm dev # открывай http://localhost:3000
```

## Что внутри

- Компонент `components/SettersResourceDashboardMock.tsx` с 3 табами (Exec/Dept/Person)
- Подкомпоненты: `ExecView`, `DeptView`, `PersonView`, `AlertCenter`, `FilterBar`
- Моки с детерминированным random (seed) — см. `lib/mockData.ts`
- Формулы: `lib/calc.ts`, качество данных `lib/quality.ts`, алерты `lib/alerts.ts`
- Экспорт XLSX/CSV: `lib/xlsxExport.ts`
- Виртуализация таблиц — заготовка (в примере таблицы компактные)
- Строгая типизация, unit-тесты `tests/formulas.test.ts`
- Страница ℹ️ «Как посчитано» — `/how-it-works`

## Архитектура данных

Модель и имена таблиц отражают целевую БД: `setters_users`, `departments`, `user_departments`, `projects`, `project_members`, `project_user_hour_plans`, `time_entries`, `setters_user_norms`, `user_vacations`, `user_day_statuses` (моки).

## Примечания

- Ролевые ограничения: PM видит агрегаты по людям без деталей (логика в `lib/roles.ts`, подключи при интеграции).
- What-if — placeholder. Интеграции (Supabase/Bitrix/Telegram) — заглушки.
- Для отчётов «собрать для совещания» — экспорт таблиц в XLSX + скрин/печать страницы.

## Тесты

```bash
pnpm test
```

## Лицензия

MIT
