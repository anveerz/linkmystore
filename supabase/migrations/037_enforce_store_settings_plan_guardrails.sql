-- Enforce storefront plan guardrails at database level.
-- Free: default theme only, branding always shown, SEO disabled.
-- Pro: branding/SEO can be customized, with sensible defaults.

CREATE OR REPLACE FUNCTION public.enforce_store_settings_plan_guardrails()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_plan TEXT;
BEGIN
  SELECT plan
    INTO creator_plan
    FROM public.creators
   WHERE id = NEW.creator_id
   LIMIT 1;

  IF creator_plan IS NULL OR creator_plan <> 'pro' THEN
    NEW.theme := 'default';
    NEW.show_branding := true;
    NEW.seo_enabled := false;
    RETURN NEW;
  END IF;

  NEW.show_branding := COALESCE(NEW.show_branding, false);
  NEW.seo_enabled := COALESCE(NEW.seo_enabled, true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_store_settings_plan_guardrails ON public.store_settings;

CREATE TRIGGER trg_enforce_store_settings_plan_guardrails
BEFORE INSERT OR UPDATE OF creator_id, theme, show_branding, seo_enabled
ON public.store_settings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_store_settings_plan_guardrails();
