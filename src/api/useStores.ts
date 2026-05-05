import { useApi } from "./useApi";
import { useCallback } from "react";

export interface StoreResponse {
  id: string;
  name: string;
  brand?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export function useStores() {
  const { get } = useApi();

  const toValidNumber = (value: unknown): number | undefined => {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const normalizeStore = (raw: any): StoreResponse => ({
    id: String(raw?.id ?? ""),
    name: String(raw?.name ?? ""),
    brand: raw?.brand ? String(raw.brand) : undefined,
    address: raw?.address ? String(raw.address) : undefined,
    city: raw?.city ? String(raw.city) : undefined,
    latitude: toValidNumber(raw?.latitude),
    longitude: toValidNumber(raw?.longitude),
  });

  const getStores = useCallback(async (filters?: { ids?: string, brands?: string, name?: string }): Promise<StoreResponse[]> => {
    let url = "/stores";
    const params = new URLSearchParams();
    if (filters?.ids) params.append("ids", filters.ids);
    if (filters?.brands) params.append("brands", filters.brands);
    if (filters?.name) params.append("name", filters.name);
    if (params.toString()) url += `?${params.toString()}`;
    const result = await get(url);
    return Array.isArray(result) ? result.map(normalizeStore) : [];
  }, [get]);

  return { getStores };
}
