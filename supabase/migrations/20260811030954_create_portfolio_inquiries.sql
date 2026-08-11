/*
# Create portfolio inquiry capture

1. New Tables
- `portfolio_inquiries` stores messages submitted through the public portfolio contact form.
- `id` is a generated UUID primary key.
- `name`, `email`, and `message` store the visitor's contact details and request.
- `created_at` records when the inquiry was submitted.

2. Security
- Row level security is enabled on `portfolio_inquiries`.
- The public portfolio does not have sign-in, so anon and authenticated roles may submit inquiries.
- Read, update, and delete access are intentionally denied to public roles; the owner can review submissions through the database dashboard.

3. Important Notes
- This is a single-tenant contact inbox, not user-owned application data.
- No existing tables or columns are modified.
*/

CREATE TABLE IF NOT EXISTS public.portfolio_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can submit portfolio inquiries" ON public.portfolio_inquiries;
CREATE POLICY "Public can submit portfolio inquiries"
  ON public.portfolio_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(trim(name)) BETWEEN 2 AND 120
    AND length(trim(email)) BETWEEN 5 AND 320
    AND length(trim(message)) BETWEEN 10 AND 4000
  );

DROP POLICY IF EXISTS "Public cannot read portfolio inquiries" ON public.portfolio_inquiries;
CREATE POLICY "Public cannot read portfolio inquiries"
  ON public.portfolio_inquiries FOR SELECT
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "Public cannot update portfolio inquiries" ON public.portfolio_inquiries;
CREATE POLICY "Public cannot update portfolio inquiries"
  ON public.portfolio_inquiries FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Public cannot delete portfolio inquiries" ON public.portfolio_inquiries;
CREATE POLICY "Public cannot delete portfolio inquiries"
  ON public.portfolio_inquiries FOR DELETE
  TO anon, authenticated
  USING (false);
