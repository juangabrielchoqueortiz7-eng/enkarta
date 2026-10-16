-- Apply after 014. Bank confirmation and service activation share one transaction.
BEGIN;
ALTER TABLE public.partner_payments DROP CONSTRAINT IF EXISTS partner_payments_status_check;
ALTER TABLE public.partner_payments ADD CONSTRAINT partner_payments_status_check CHECK(status IN ('pending','approved','rejected','canceled'));
ALTER TABLE public.partner_payments ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'manual' CHECK(provider IN ('manual','bcp'));
ALTER TABLE public.partner_payments ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BOB' CHECK(currency='BOB');
ALTER TABLE public.partner_payments ADD COLUMN IF NOT EXISTS quote_locked_at timestamptz;
ALTER TABLE public.partner_payments ADD COLUMN IF NOT EXISTS provider_reference text;
ALTER TABLE public.partner_payments ADD COLUMN IF NOT EXISTS provider_transaction_id text;
ALTER TABLE public.partner_payments ADD COLUMN IF NOT EXISTS reviewed_by text;
CREATE UNIQUE INDEX IF NOT EXISTS partner_payment_bank_transaction ON public.partner_payments(provider,provider_transaction_id) WHERE provider_transaction_id IS NOT NULL;
-- Restore only access backed by an already approved, still-valid paid period.
-- Old receipt/rejection routes could replace active with pending/none.
UPDATE public.partner_subscriptions s SET status='active',updated_at=statement_timestamp()
WHERE s.status IN ('pending','none') AND s.current_period_end+interval '5 days'>statement_timestamp()
  AND EXISTS(SELECT 1 FROM public.partner_payments p WHERE p.partner_id=s.partner_id AND p.status='approved' AND p.period_end>=s.current_period_end);

-- Preserve duplicate historical attempts instead of deleting their evidence.
WITH duplicates AS (SELECT id,row_number() OVER(PARTITION BY partner_id ORDER BY (receipt_url<>'') DESC,created_at DESC,id) AS rank
  FROM public.partner_payments WHERE status='pending')
UPDATE public.partner_payments p SET status='canceled',review_note=concat_ws(' ',nullif(review_note,''),'Intento duplicado archivado por migración 015.')
FROM duplicates d WHERE p.id=d.id AND d.rank>1;
CREATE UNIQUE INDEX IF NOT EXISTS partner_one_pending_payment ON public.partner_payments(partner_id) WHERE status='pending';

CREATE OR REPLACE FUNCTION public.enkarta_payment_intent(
  p_partner_id uuid,p_plan text,p_months integer,p_amount numeric,p_method text,p_reference text,p_provider text DEFAULT 'manual'
) RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE existing public.partner_payments%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.partners WHERE id=p_partner_id AND status='active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYMENT_FORBIDDEN'; END IF;
  IF p_plan NOT IN ('inicio','estudio','agencia') OR p_months NOT IN (1,3,6,12) OR p_amount<=0 OR p_provider NOT IN ('manual','bcp') THEN RAISE EXCEPTION 'INVALID_PAYMENT'; END IF;
  SELECT * INTO existing FROM public.partner_payments WHERE partner_id=p_partner_id AND status='pending' FOR UPDATE;
  IF FOUND THEN
    IF (existing.plan_key,existing.months,existing.amount_bs,existing.method,existing.provider)
      IS NOT DISTINCT FROM (p_plan,p_months,p_amount,p_method,p_provider) THEN RETURN to_jsonb(existing); END IF;
    IF existing.quote_locked_at IS NOT NULL OR existing.receipt_url<>'' OR existing.payer_note<>'' OR existing.provider_reference IS NOT NULL THEN RAISE EXCEPTION 'PAYMENT_LOCKED'; END IF;
    UPDATE public.partner_payments SET plan_key=p_plan,months=p_months,amount_bs=p_amount,method=p_method,provider=p_provider,updated_at=statement_timestamp()
      WHERE id=existing.id RETURNING * INTO existing;
  ELSE
    INSERT INTO public.partner_payments(reference,partner_id,plan_key,months,amount_bs,method,provider)
      VALUES(p_reference,p_partner_id,p_plan,p_months,p_amount,p_method,p_provider) RETURNING * INTO existing;
  END IF;
  RETURN to_jsonb(existing);
END;
$$;

CREATE OR REPLACE FUNCTION public.enkarta_attach_payment_receipt(p_partner_id uuid,p_payment_id uuid,p_path text,p_note text)
RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE payment public.partner_payments%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.partners WHERE id=p_partner_id AND status='active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYMENT_FORBIDDEN'; END IF;
  SELECT * INTO payment FROM public.partner_payments WHERE id=p_payment_id AND partner_id=p_partner_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF payment.status<>'pending' OR payment.provider<>'manual' THEN RAISE EXCEPTION 'PAYMENT_LOCKED'; END IF;
  IF coalesce(p_path,'')='' AND coalesce(p_note,'')='' THEN RAISE EXCEPTION 'INVALID_PAYMENT'; END IF;
  UPDATE public.partner_payments SET receipt_url=coalesce(nullif(p_path,''),receipt_url),payer_note=coalesce(nullif(p_note,''),payer_note),
    quote_locked_at=coalesce(quote_locked_at,statement_timestamp()),updated_at=statement_timestamp() WHERE id=p_payment_id RETURNING * INTO payment;
  -- A receipt never alters subscription status, its paid term or its grace period.
  RETURN to_jsonb(payment);
END;
$$;

CREATE OR REPLACE FUNCTION public.enkarta_review_payment(
  p_payment_id uuid,p_action text,p_note text,p_reviewer text,p_provider_transaction text DEFAULT NULL,p_verified_amount numeric DEFAULT NULL,p_verified_currency text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE payment public.partner_payments%ROWTYPE; owner_id uuid; sub public.partner_subscriptions%ROWTYPE;
  period_start_at timestamptz; period_end_at timestamptz; now_at timestamptz:=statement_timestamp();
BEGIN
  SELECT partner_id INTO owner_id FROM public.partner_payments WHERE id=p_payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  -- Every payment operation takes these locks in the same order.
  PERFORM 1 FROM public.partners WHERE id=owner_id FOR UPDATE;
  SELECT * INTO payment FROM public.partner_payments WHERE id=p_payment_id FOR UPDATE;
  IF p_action NOT IN ('approve','reject') OR nullif(p_reviewer,'') IS NULL THEN RAISE EXCEPTION 'INVALID_PAYMENT'; END IF;
  IF payment.provider='bcp' AND p_action='approve' AND (nullif(p_provider_transaction,'') IS NULL OR p_verified_amount IS DISTINCT FROM payment.amount_bs OR p_verified_currency IS DISTINCT FROM payment.currency) THEN
    RAISE EXCEPTION 'BANK_CONFIRMATION_REQUIRED';
  END IF;
  IF payment.status='approved' AND p_action='approve' THEN
    IF payment.provider='bcp' AND payment.provider_transaction_id IS DISTINCT FROM p_provider_transaction THEN RAISE EXCEPTION 'PAYMENT_LOCKED'; END IF;
    RETURN jsonb_build_object('success',true,'replayed',true,'periodEnd',payment.period_end);
  END IF;
  IF payment.status<>'pending' THEN RAISE EXCEPTION 'PAYMENT_LOCKED'; END IF;
  IF p_action='reject' THEN
    UPDATE public.partner_payments SET status='rejected',review_note=p_note,reviewed_by=p_reviewer,reviewed_at=now_at,updated_at=now_at WHERE id=p_payment_id;
    RETURN jsonb_build_object('success',true);
  END IF;
  SELECT * INTO sub FROM public.partner_subscriptions WHERE partner_id=owner_id FOR UPDATE;
  period_start_at:=greatest(coalesce(sub.current_period_end,now_at),now_at);
  -- PostgreSQL clamps the end of calendar months (Jan 31 + 1 month = Feb 28/29).
  period_end_at:=(period_start_at AT TIME ZONE 'America/La_Paz' + make_interval(months=>payment.months)) AT TIME ZONE 'America/La_Paz';
  UPDATE public.partner_payments SET status='approved',review_note=p_note,reviewed_by=p_reviewer,reviewed_at=now_at,
    period_start=period_start_at,period_end=period_end_at,provider_transaction_id=p_provider_transaction,updated_at=now_at WHERE id=p_payment_id;
  INSERT INTO public.partner_subscriptions(partner_id,plan_key,status,started_at,current_period_end,updated_at)
    VALUES(owner_id,payment.plan_key,'active',coalesce(sub.started_at,now_at),period_end_at,now_at)
  ON CONFLICT(partner_id) DO UPDATE SET plan_key=excluded.plan_key,status=excluded.status,started_at=excluded.started_at,
    current_period_end=excluded.current_period_end,updated_at=excluded.updated_at;
  RETURN jsonb_build_object('success',true,'replayed',false,'periodEnd',period_end_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.enkarta_cancel_payment(p_partner_id uuid,p_payment_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE payment public.partner_payments%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.partners WHERE id=p_partner_id FOR UPDATE;
  SELECT * INTO payment FROM public.partner_payments WHERE id=p_payment_id AND partner_id=p_partner_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF payment.status='canceled' THEN RETURN; END IF;
  UPDATE public.partner_payments SET status='canceled',updated_at=statement_timestamp()
    WHERE id=p_payment_id AND partner_id=p_partner_id AND status='pending' AND provider='manual';
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYMENT_LOCKED'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.enkarta_payment_intent(uuid,text,integer,numeric,text,text,text),public.enkarta_attach_payment_receipt(uuid,uuid,text,text),
  public.enkarta_review_payment(uuid,text,text,text,text,numeric,text),public.enkarta_cancel_payment(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enkarta_payment_intent(uuid,text,integer,numeric,text,text,text),public.enkarta_attach_payment_receipt(uuid,uuid,text,text),
  public.enkarta_review_payment(uuid,text,text,text,text,numeric,text),public.enkarta_cancel_payment(uuid,uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
