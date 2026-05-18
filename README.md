# PrGuessrCup

Приложение для ведения учета результатов игры в TimeGuessr среди группы друзей.

## Стек технологий
- Frontend: React (Vite) + TypeScript + Tailwind CSS
- Database & Auth: Supabase (PostgreSQL)
- OCR: Tesseract.js

## Настройка базы данных (Supabase)
1. Создайте новый проект в [Supabase](https://supabase.com).
2. Перейдите в раздел **SQL Editor** и выполните скрипт из файла `supabase_schema.sql`.
3. Перейдите в раздел **Project Settings -> API** и скопируйте `Project URL` и `anon public key`.
4. Вставьте их в файл `.env` в корне проекта:
   ```env
   VITE_SUPABASE_URL=ваш_url
   VITE_SUPABASE_ANON_KEY=ваш_ключ
   VITE_ADMIN_PASSWORD=ваш_пароль_администратора
   ```

## Запуск проекта
```bash
npm install
npm run dev
```

## Использование
- **Главная страница**: Просмотр списка лиг и кубков.
- **Страница Кубка**: Таблица лидеров с подсчетом очков Гран-при.
- **Панель Администратора (`/admin`)**: Вход по паролю из `.env`. Позволяет создавать лиги, кубки, участников, а также вводить результаты игр вручную или через загрузку скриншота (OCR).
