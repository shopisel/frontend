import { useCallback } from "react";
import { useApi } from "./useApi";

type FavoriteResponseItem = string | { productId?: string | null };

function normalizeFavoriteIds(payload: unknown): string[] {
  if (!Array.isArray(payload)) return [];

  return payload
    .map((item): string | null => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "productId" in item) {
        const value = (item as FavoriteResponseItem & { productId?: unknown }).productId;
        return typeof value === "string" ? value : null;
      }
      return null;
    })
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim());
}

export function useAccounts() {
  const { get, post, del } = useApi();

  const syncMyAccount = useCallback(async (): Promise<void> => {
    await post("/accounts/me/sync", {});
  }, [post]);

  const getMyFavoriteProductIds = useCallback(async (): Promise<string[]> => {
    const response = await get("/accounts/me/favorites");
    return normalizeFavoriteIds(response);
  }, [get]);

  const addFavoriteProduct = useCallback(
    async (productId: string): Promise<void> => {
      await post("/accounts/me/favorites", { productId });
    },
    [post]
  );

  const removeFavoriteProduct = useCallback(
    async (productId: string): Promise<void> => {
      await del(`/accounts/me/favorites/${encodeURIComponent(productId)}`);
    },
    [del]
  );

  return {
    syncMyAccount,
    getMyFavoriteProductIds,
    addFavoriteProduct,
    removeFavoriteProduct,
  };
}
