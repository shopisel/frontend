import { useApi } from "./useApi";
import { useCallback } from "react";

export interface PriceResponse {
  id: string;
  productId: string;
  storeId: string;
  price: number;
  updatedAt: string;
}

export function usePrices() {
  const { get } = useApi();

  const getPrices = useCallback(async (productId: string, storeId?: string): Promise<PriceResponse[]> => {
    let url = `/prices?productId=${encodeURIComponent(productId)}`;
    if (storeId) url += `&storeId=${encodeURIComponent(storeId)}`;
    const res = await get(url);
    if (Array.isArray(res)) return res;
    if (res) return [res];
    return [];
  }, [get]);

  return { getPrices };
}
