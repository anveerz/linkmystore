-- Enforce free-plan own-product limit at database level.
-- This prevents bypass via parallel tabs, stale clients, or direct API calls.

CREATE OR REPLACE FUNCTION public.enforce_free_plan_product_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_plan TEXT;
  active_own_count INTEGER;
  is_own_product BOOLEAN;
  was_active_own BOOLEAN;
BEGIN
  is_own_product := COALESCE(NEW.is_affiliate, false) = false;

  IF TG_OP = 'UPDATE' THEN
    was_active_own := COALESCE(OLD.is_active, false) = true AND COALESCE(OLD.is_affiliate, false) = false;
  ELSE
    was_active_own := false;
  END IF;

  -- Limit only applies to active own products.
  IF COALESCE(NEW.is_active, false) = false OR is_own_product = false THEN
    RETURN NEW;
  END IF;

  SELECT plan
    INTO creator_plan
    FROM public.creators
   WHERE id = NEW.creator_id
   LIMIT 1;

  -- Missing creator or Pro creator: skip enforcement.
  IF creator_plan IS NULL OR creator_plan <> 'free' THEN
    RETURN NEW;
  END IF;

  -- Already active own product on same creator -> no net increase.
  IF TG_OP = 'UPDATE' AND was_active_own AND OLD.creator_id = NEW.creator_id THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
    INTO active_own_count
    FROM public.products
   WHERE creator_id = NEW.creator_id
     AND is_active = true
     AND COALESCE(is_affiliate, false) = false
     AND (NEW.id IS NULL OR id <> NEW.id);

  IF active_own_count >= 5 THEN
    RAISE EXCEPTION
      USING
        ERRCODE = 'P0001',
        MESSAGE = 'FREE_PLAN_PRODUCT_LIMIT_REACHED',
        DETAIL = 'Free plan allows up to 5 active own products. Upgrade to Pro for unlimited products.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_free_plan_product_limit ON public.products;

CREATE TRIGGER trg_enforce_free_plan_product_limit
BEFORE INSERT OR UPDATE OF creator_id, is_active, is_affiliate
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.enforce_free_plan_product_limit();

