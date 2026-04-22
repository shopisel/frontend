import { useApi } from "./useApi";
import { useCallback } from "react";

export interface PriceResponse {
  id: string;
  productId: string;
  storeId: string;
  price: number;
  sale?: number;
  saleDate?: string;
  updatedAt: string;
}

const toValidNumber = (value: unknown): number | undefined => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
};

const normalizePrice = (raw: any): PriceResponse => {
  const price = toValidNumber(raw?.price) ?? 0;
  const sale = toValidNumber(raw?.sale);

  return {
    id: String(raw?.id ?? ""),
    productId: String(raw?.productId ?? raw?.product_id ?? ""),
    storeId: String(raw?.storeId ?? raw?.store_id ?? ""),
    price,
    sale,
    saleDate: raw?.saleDate ?? raw?.sale_date,
    updatedAt: String(raw?.updatedAt ?? raw?.updated_at ?? ""),
  };
};

export function usePrices() {
  const { get } = useApi();

  const getPrices = useCallback(async (productId: string, storeId?: string): Promise<PriceResponse[]> => {
    let url = `/prices?productId=${encodeURIComponent(productId)}`;
    if (storeId) url += `&storeId=${encodeURIComponent(storeId)}`;
    const res = await get(url);
    if (Array.isArray(res)) return res.map(normalizePrice);
    if (res) return [normalizePrice(res)];
    return [];
  }, [get]);

  return { getPrices };
}

export const calculateDiscountPercentage = (original: number, discounted: number) => {
  if (original <= 0 || discounted >= original) return 0;
  return Math.round(((original - discounted) / original) * 100);
};
