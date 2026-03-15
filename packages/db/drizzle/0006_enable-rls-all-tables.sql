-- Enable Row-Level Security on all tables as defense-in-depth.
--
-- The API connects with a service-role key (which bypasses RLS), so these
-- policies do NOT affect the application today. They exist to:
--   1. Block direct access if a less-privileged role is ever introduced.
--   2. Prevent accidental data exposure via the Supabase Dashboard / REST API
--      when using the anon key.
--
-- The default policy for each table is DENY ALL — only the service role
-- (and superuser) can read/write. If we later add client-side Supabase
-- access we'll add explicit ALLOW policies per table.

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding_snoozes ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_snoozes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
