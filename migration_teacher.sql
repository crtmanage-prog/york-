-- ============================================================
-- YORK! — миграция №2: роли (учитель/ученик)
-- Вставь целиком в Supabase → SQL Editor → New query → Run
-- Это ДОБАВЛЯЕТ к уже существующим таблицам, ничего не удаляет
-- и не трогает уже внесённые данные.
-- ============================================================

-- ---------- РОЛИ В PROFILES ----------
alter table public.profiles
  add column role text check (role in ('student','teacher')) default 'student';

alter table public.profiles
  add column teacher_id uuid references public.profiles(id);

-- ---------- teacher_id В СВЯЗАННЫХ ТАБЛИЦАХ ----------
alter table public.homework
  add column teacher_id uuid references public.profiles(id);

alter table public.lessons
  add column teacher_id uuid references public.profiles(id);

alter table public.progress_notes
  add column teacher_id uuid references public.profiles(id);

-- ============================================================
-- НОВЫЕ ПРАВИЛА ДОСТУПА — учитель видит и ведёт своих учеников
-- (старые правила для учеников остаются как были, эти добавляются
-- рядом и работают через "или": подходит любое из условий)
-- ============================================================

-- профиль: учитель видит профили своих учеников
create policy "teacher select own students" on public.profiles
  for select using (auth.uid() = teacher_id);

-- домашка: учитель видит, создаёт и проверяет домашку своих учеников
create policy "teacher select homework" on public.homework
  for select using (auth.uid() = teacher_id);

create policy "teacher insert homework" on public.homework
  for insert with check (auth.uid() = teacher_id);

create policy "teacher update homework" on public.homework
  for update using (auth.uid() = teacher_id);

-- уроки: учитель видит и создаёт уроки своих учеников
create policy "teacher select lessons" on public.lessons
  for select using (auth.uid() = teacher_id);

create policy "teacher insert lessons" on public.lessons
  for insert with check (auth.uid() = teacher_id);

create policy "teacher update lessons" on public.lessons
  for update using (auth.uid() = teacher_id);

-- прогресс: учитель видит и добавляет заметки о прогрессе
create policy "teacher select progress" on public.progress_notes
  for select using (auth.uid() = teacher_id);

create policy "teacher insert progress" on public.progress_notes
  for insert with check (auth.uid() = teacher_id);

-- оплата: у payments нет своего teacher_id (как и было решено),
-- поэтому доступ учителя проверяется через связь ученик → учитель
create policy "teacher select payments" on public.payments
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = payments.student_id
      and profiles.teacher_id = auth.uid()
    )
  );

-- ============================================================
-- ГОТОВО. Дальше вручную, через Table Editor:
--
-- 1. Authentication → Add user → заведи логин для учителя
--    (например, себя — Kate).
-- 2. Скопируй его User UID.
-- 3. Table Editor → profiles → Insert row:
--      id = UID учителя
--      full_name = "Kate"
--      role = 'teacher'
--      teacher_id = (оставить пустым)
-- 4. Table Editor → profiles → найди строку тестового ученика →
--      впиши в его teacher_id = UID учителя из шага 2.
--      Это и свяжет ученика с учителем.
--
-- Важно: в UI используются статусы 'assigned' / 'submitted' /
-- 'reviewed' (не 'checked') — так уже сделано в cabinet.html,
-- чтобы всё совпадало без переделок.
-- ============================================================
