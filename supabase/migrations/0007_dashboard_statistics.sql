-- Statistik dashboard host dalam satu round trip.
--
-- SECURITY INVOKER sengaja dipakai agar RLS tetap menjadi batas akses. Fungsi
-- ini hanya mengagregasi event, guest, dan photo yang boleh dibaca sesi host.

CREATE OR REPLACE FUNCTION public.get_host_event_counts()
RETURNS TABLE (
  event_id UUID,
  photo_count BIGINT,
  guest_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH photo_counts AS (
    SELECT p.event_id, COUNT(*)::BIGINT AS total
    FROM public.photos AS p
    WHERE p.status = 'ready'
    GROUP BY p.event_id
  ),
  guest_counts AS (
    SELECT g.event_id, COUNT(*)::BIGINT AS total
    FROM public.guests AS g
    GROUP BY g.event_id
  )
  SELECT
    e.id,
    COALESCE(p.total, 0)::BIGINT,
    COALESCE(g.total, 0)::BIGINT
  FROM public.events AS e
  LEFT JOIN photo_counts AS p ON p.event_id = e.id
  LEFT JOIN guest_counts AS g ON g.event_id = e.id
  WHERE e.host_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_host_event_counts()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_host_event_counts()
  TO authenticated;

COMMENT ON FUNCTION public.get_host_event_counts() IS
  'Exact ready-photo and guest totals for every event visible to the current host via RLS.';
