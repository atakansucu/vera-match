-- Add missing FK from reflection_events.introduction_id to introductions.
-- The column existed as a plain uuid; this migration adds the referential constraint
-- with ON DELETE SET NULL so a reflection survives if the introduction is removed.

alter table public.reflection_events
  add constraint reflection_events_introduction_id_fkey
    foreign key (introduction_id) references public.introductions (id)
    on delete set null;
