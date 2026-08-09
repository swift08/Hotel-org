-- Fix enforce_order_status_transition() trigger function in PostgreSQL
-- Removing invalid 'rejected' string literal from IN() list so PostgreSQL doesn't throw invalid enum error on order updates

CREATE OR REPLACE FUNCTION public.enforce_order_status_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'pending' AND NEW.status IN ('accepted', 'cancelled')) OR
      (OLD.status = 'accepted' AND NEW.status IN ('preparing', 'cancelled')) OR
      (OLD.status = 'preparing' AND NEW.status IN ('ready', 'cancelled')) OR
      (OLD.status = 'ready' AND NEW.status IN ('served', 'cancelled')) OR
      (OLD.status = 'served' AND NEW.status IN ('completed')) OR
      (OLD.status = 'completed' AND NEW.status IN ('refunded')) OR
      (OLD.status = 'payment_failed' AND NEW.status IN ('pending', 'cancelled'))
    ) THEN
      RAISE EXCEPTION 'Invalid order status transition from % to %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.track_price_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'products' AND NEW.base_price IS DISTINCT FROM OLD.base_price THEN
    INSERT INTO public.price_history (business_id, product_id, old_price, new_price, changed_by)
    VALUES (NEW.business_id, NEW.id, OLD.base_price, NEW.base_price, auth.uid());
  ELSIF TG_TABLE_NAME = 'product_variants' AND NEW.price IS DISTINCT FROM OLD.price THEN
    INSERT INTO public.price_history (business_id, product_id, variant_id, old_price, new_price, changed_by)
    VALUES (NEW.business_id, NEW.product_id, NEW.id, OLD.price, NEW.price, auth.uid());
  END IF;
  RETURN NEW;
END; $$;
