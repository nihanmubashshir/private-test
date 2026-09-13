-- Weight to four decimal places (US-009, owner instruction).
--
-- numeric(5,2) silently rounded anything finer to 2dp on insert, so allowing more decimals in the
-- keypad without widening the column would have thrown the extra digits away at the database.
-- numeric(7,4) holds up to 999.9999, comfortably past the 400 kg ceiling.
alter table public.weigh_ins
  alter column value_kg type numeric(7, 4);
