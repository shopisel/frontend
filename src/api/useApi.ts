import { useAuth } from "../auth/AuthProvider";
import { useCallback } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export function useApi() {
  const { getAccessToken } = useAuth();

  const fetchWithAuth = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const token = await getAccessToken();
    
    const headers = new Headers(options.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    
    if (!(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = response.statusText;
      }
      throw new Error(typeof errorData === "string" ? errorData : errorData?.message || response.statusText);
    }

    if (response.status === 204) {
      return null;
    }
    
    try {
      return await response.json();
    } catch {
      return null;
    }
  }, [getAccessToken]);

  const get = useCallback((endpoint: string) => fetchWithAuth(endpoint), [fetchWithAuth]);
  const post = useCallback((endpoint: string, body?: any) => fetchWithAuth(endpoint, { method: "POST", body: JSON.stringify(body) }), [fetchWithAuth]);
  const put = useCallback((endpoint: string, body?: any) => fetchWithAuth(endpoint, { method: "PUT", body: JSON.stringify(body) }), [fetchWithAuth]);
  const patch = useCallback((endpoint: string, body?: any) => fetchWithAuth(endpoint, { method: "PATCH", body: JSON.stringify(body) }), [fetchWithAuth]);
  const del = useCallback((endpoint: string) => fetchWithAuth(endpoint, { method: "DELETE" }), [fetchWithAuth]);

  return { get, post, put, patch, del };
}
