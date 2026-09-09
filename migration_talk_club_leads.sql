-- ============================================================
-- YORK! — миграция: заявки на TALK CLUB (talk_club_leads)
-- Вставь целиком в Supabase → SQL Editor → New query → Run
-- Это ДОБАВЛЯЕТ новую таблицу, ничего не удаляет и не трогает
-- существующие данные/таблицы (в т.ч. trial_requests — отдельная
-- воронка, эта таблица с ней не связана).
-- ============================================================

create table public.talk_club_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  contact text not null,                    -- телефон или @telegram, как ввёл человек
  is_existing_student boolean not null,      -- уже ученик YORK! (SOLO/CREW)?
  timezone text,                             -- IANA-строка, напр. Asia/Yekaterinburg
  level text,                                -- 'A1-A2' / 'B1' / 'B2+' / 'Не уверен(а)'
  preferred_days text[],                     -- напр. {Пн,Ср,Пт}
  preferred_time_of_day text,                -- 'Утро' / 'День' / 'Вечер'
  referrer_name text,                        -- ФИО пригласившего — вручную, без авто-логики скидки
  comment text,
  archived boolean not null default false,   -- как в trial_requests — прячем обработанные, не удаляя
  created_at timestamptz not null default now()
);

alter table public.talk_club_leads enable row level security;

-- анонимная публичная форма (talk-club-form.html) шлёт заявки без логина —
-- разрешаем insert всем, как и для trial_requests
create policy "public insert talk club leads" on public.talk_club_leads
  for insert with check (true);

-- читать и обрабатывать заявки может только админ
create policy "admin select talk club leads" on public.talk_club_leads
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "admin update talk club leads" on public.talk_club_leads
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- ============================================================
-- ГОТОВО. После применения — проверь в Table Editor, что таблица
-- talk_club_leads появилась и RLS включён (иконка замка зелёная).
-- ============================================================
