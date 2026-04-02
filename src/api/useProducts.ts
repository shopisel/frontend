import { useApi } from "./useApi";
import { useCallback } from "react";

export interface Category {
  id: string;
  name: string;
  image?: string;
  emoji?: string;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  categoryId: string;
  emoji?: string;
}

export function useProducts() {
  const { get } = useApi();

  const searchProducts = useCallback(async (query: string): Promise<Product[]> => {
    return await get(`/products?name=${encodeURIComponent(query)}`);
  }, [get]);

  const getCategories = useCallback(async (): Promise<Category[]> => {
    return await get("/categories");
  }, [get]);

  const getProductsByCategory = useCallback(async (categoryId: string): Promise<Product[]> => {
    return await get(`/products?categoryId=${encodeURIComponent(categoryId)}`);
  }, [get]);

  const getProductsByIds = useCallback(async (ids: string[]): Promise<Product[]> => {
    if (!ids.length) return [];
    return await get(`/products?ids=${encodeURIComponent(ids.join(","))}`);
  }, [get]);

  return { searchProducts, getCategories, getProductsByCategory, getProductsByIds };
}
