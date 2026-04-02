import { useApi } from "./useApi";
import { useCallback } from "react";

export interface StoreResponse {
  id: string;
  name: string;
}

export function useStores() {
  const { get } = useApi();

  const getStores = useCallback(async (filters?: { ids?: string, name?: string }): Promise<StoreResponse[]> => {
    let url = "/stores";
    const params = new URLSearchParams();
    if (filters?.ids) params.append("ids", filters.ids);
    if (filters?.name) params.append("name", filters.name);
    if (params.toString()) url += `?${params.toString()}`;
    return await get(url);
  }, [get]);

  return { getStores };
}
