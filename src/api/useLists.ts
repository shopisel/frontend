import { useApi } from "./useApi";
import { useCallback } from "react";

export interface ListItemResponse {
  id: number;
  productId: string;
  storeId: string;
  quantity: number;
  price: number;
  checked: boolean;
}

export interface ListResponse {
  id: string;
  name: string;
  createdAt: string;
  items: ListItemResponse[];
}

export interface ListItemRequest {
  productId: string;
  storeId: string;
  quantity: number;
  price: number;
  checked: boolean;
}

export function useLists() {
  const { get, post, put, del } = useApi();

  const getLists = useCallback(async (): Promise<ListResponse[]> => {
    return await get("/lists");
  }, [get]);

  const getList = useCallback(async (listId: string): Promise<ListResponse> => {
    return await get(`/lists/${listId}`);
  }, [get]);

  const createList = useCallback(async (name: string): Promise<ListResponse> => {
    return await post("/lists", { name, items: [] });
  }, [post]);

  const updateList = useCallback(async (listId: string, name: string | undefined, items: ListItemRequest[]): Promise<ListResponse> => {
    const payload: any = { items };
    if (name !== undefined) payload.name = name;
    return await put(`/lists/${listId}`, payload);
  }, [put]);

  const removeList = useCallback(async (listId: string) => {
    return await del(`/lists/${listId}`);
  }, [del]);

  return { getLists, getList, createList, updateList, removeList };
}
