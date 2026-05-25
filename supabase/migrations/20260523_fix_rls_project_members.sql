-- Fix: RLS recursion in project_members + missing admin bypass
CREATE OR REPLACE FUNCTION public.get_my_project_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT array_agg(project_id)
  FROM public.project_members
  WHERE user_id = auth.uid();
$$;

DROP POLICY IF EXISTS "pm_select_project_members" ON project_members;
CREATE POLICY "pm_select_project_members" ON project_members
  FOR SELECT
  USING (
    get_my_role() = 'admin'
    OR project_id = ANY(get_my_project_ids())
  );

DROP POLICY IF EXISTS "pm_insert_owner_or_admin" ON project_members;
CREATE POLICY "pm_insert_owner_or_admin" ON project_members
  FOR INSERT
  WITH CHECK (
    get_my_role() = 'admin'
    OR get_my_project_role(project_id) IN ('owner', 'editor', 'admin')
  );
