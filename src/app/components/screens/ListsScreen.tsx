import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, ChevronRight, Check, Search, ShoppingCart, RefreshCw } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";

type ListItem = {
  productId: string;
  checked: boolean;
};

type ShoppingList = {
  id: string;
  name: string;
  createdAt: string;
  items: ListItem[];
};

type ApiError = {
  title?: string;
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

async function parseApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ApiError;
    if (payload.detail) return payload.detail;
    if (payload.title) return payload.title;
    if (payload.message) return payload.message;
    if (payload.errors) {
      const flattened = Object.values(payload.errors).flat();
      if (flattened.length > 0) return flattened.join(" ");
    }
  } catch {
    // Ignore parse errors and try text fallback.
  }

  const text = await response.text().catch(() => "");
  return text || `Pedido falhou com status ${response.status}`;
}

function formatDate(input: string): string {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return "Sem data";

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function ListsScreen({ onNavigate: _onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { isAuthenticated, getAccessToken } = useAuth();

  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [view, setView] = useState<"lists" | "items">("lists");
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [addInput, setAddInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeList = useMemo(
    () => lists.find((list) => list.id === activeListId) ?? null,
    [lists, activeListId]
  );

  const visibleItems = useMemo(() => {
    if (!activeList) return [];
    const query = searchInput.trim().toLowerCase();
    if (!query) return activeList.items;
    return activeList.items.filter((item) => item.productId.toLowerCase().includes(query));
  }, [activeList, searchInput]);

  const checkedCount = activeList?.items.filter((item) => item.checked).length ?? 0;
  const itemCount = activeList?.items.length ?? 0;
  const progressWidth = itemCount > 0 ? (checkedCount / itemCount) * 100 : 0;
  const remainingCount = (activeList?.items.length ?? 0) - checkedCount;

  const getAuthorizedHeaders = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      throw new Error("Sessao expirada. Faz login novamente.");
    }

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, [getAccessToken]);

  const fetchLists = useCallback(async () => {
    if (!isAuthenticated) {
      setLists([]);
      setActiveListId(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const headers = await getAuthorizedHeaders();
      const response = await fetch(`${API_BASE_URL}/lists`, { headers });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const data = (await response.json()) as ShoppingList[];
      setLists(data);
      setActiveListId((current) => {
        if (!data.length) return null;
        if (current && data.some((list) => list.id === current)) return current;
        return data[0].id;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao carregar listas.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthorizedHeaders, isAuthenticated]);

  useEffect(() => {
    void fetchLists();
  }, [fetchLists]);

  const persistItems = useCallback(
    async (nextItems: ListItem[]) => {
      if (!activeList) return;

      setIsSaving(true);
      setErrorMessage(null);

      try {
        const headers = await getAuthorizedHeaders();
        const response = await fetch(`${API_BASE_URL}/lists/${activeList.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ items: nextItems }),
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        setLists((current) =>
          current.map((list) => (list.id === activeList.id ? { ...list, items: nextItems } : list))
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao atualizar lista.";
        setErrorMessage(message);
      } finally {
        setIsSaving(false);
      }
    },
    [activeList, getAuthorizedHeaders]
  );

  const toggleItem = useCallback(
    async (productId: string) => {
      if (!activeList) return;
      const nextItems = activeList.items.map((item) =>
        item.productId === productId ? { ...item, checked: !item.checked } : item
      );
      await persistItems(nextItems);
    },
    [activeList, persistItems]
  );

  const deleteItem = useCallback(
    async (productId: string) => {
      if (!activeList) return;
      const nextItems = activeList.items.filter((item) => item.productId !== productId);
      await persistItems(nextItems);
    },
    [activeList, persistItems]
  );

  const addItem = useCallback(async () => {
    const value = addInput.trim();
    if (!value || !activeList) return;

    const exists = activeList.items.some((item) => item.productId.toLowerCase() === value.toLowerCase());
    if (exists) {
      setErrorMessage("Esse productId ja existe na lista.");
      return;
    }

    const nextItems = [...activeList.items, { productId: value, checked: false }];
    await persistItems(nextItems);
    setAddInput("");
    setShowAdd(false);
  }, [activeList, addInput, persistItems]);

  const createList = useCallback(async () => {
    const name = window.prompt("Nome da nova lista:");
    if (!name || !name.trim()) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const headers = await getAuthorizedHeaders();
      const response = await fetch(`${API_BASE_URL}/lists`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: name.trim(), items: [] }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const created = (await response.json()) as ShoppingList;
      setLists((current) => [created, ...current]);
      setActiveListId(created.id);
      setView("items");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao criar lista.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }, [getAuthorizedHeaders]);

  if (view === "lists") {
    return (
      <div className="flex flex-col h-full bg-[#F8F9FC]">
        <div className="px-5 pt-12 pb-4 bg-white">
          <h1 className="text-gray-900 mb-1" style={{ fontSize: 24, fontWeight: 700 }}>
            Shopping Lists
          </h1>
          <p className="text-gray-400" style={{ fontSize: 14 }}>
            Gerido pelo list-service
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {errorMessage && (
            <div className="mb-4 rounded-2xl bg-red-50 border border-red-100 p-3">
              <p className="text-red-700" style={{ fontSize: 13 }}>
                {errorMessage}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end mb-3">
            <button
              onClick={() => void fetchLists()}
              disabled={isLoading || isSaving}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-50"
              aria-label="Atualizar listas"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-3xl p-5" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              <p className="text-gray-500" style={{ fontSize: 14 }}>
                A carregar listas...
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mb-6">
              {lists.map((list, i) => (
                <motion.div
                  key={list.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white rounded-3xl p-5 cursor-pointer"
                  style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setActiveListId(list.id);
                    setView("items");
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50">
                        <ShoppingCart className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-gray-900" style={{ fontSize: 15, fontWeight: 700 }}>
                          {list.name}
                        </p>
                        <p className="text-gray-400" style={{ fontSize: 12 }}>
                          {list.items.length} items
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 mt-1" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400" style={{ fontSize: 12 }}>
                      Criada em {formatDate(list.createdAt)}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#6366F1" }}>
                      {list.items.filter((item) => !item.checked).length} por comprar
                    </span>
                  </div>
                </motion.div>
              ))}

              {!lists.length && (
                <div className="bg-white rounded-3xl p-5" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
                  <p className="text-gray-500" style={{ fontSize: 14 }}>
                    Ainda nao tens listas. Cria a primeira.
                  </p>
                </div>
              )}
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => void createList()}
            disabled={isSaving || isLoading}
            className="w-full py-4 rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Plus className="w-5 h-5 text-gray-400" />
            <span className="text-gray-400" style={{ fontSize: 14, fontWeight: 600 }}>
              {isSaving ? "A criar..." : "Create New List"}
            </span>
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F8F9FC]">
      <div className="px-5 pt-12 pb-4 bg-white">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => setView("lists")} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-gray-500 rotate-180" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-gray-900 truncate" style={{ fontSize: 20, fontWeight: 700 }}>
              {activeList?.name ?? "Lista"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-500 rounded-full"
              animate={{ width: `${progressWidth}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <span className="text-gray-500" style={{ fontSize: 12, fontWeight: 600 }}>
            {checkedCount}/{itemCount}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              placeholder="Pesquisar por productId..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="flex-1 bg-transparent outline-none text-gray-700"
              style={{ fontSize: 13 }}
            />
          </div>
          <div className="bg-indigo-50 rounded-xl px-3 py-2.5">
            <span style={{ fontSize: 13, fontWeight: 700, color: "#6366F1" }}>{remainingCount} restantes</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="px-5 pt-3">
          <div className="rounded-2xl bg-red-50 border border-red-100 p-3">
            <p className="text-red-700" style={{ fontSize: 13 }}>
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-3">
        <AnimatePresence>
          {visibleItems.map((item) => (
            <motion.div
              key={item.productId}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="bg-white rounded-2xl mb-2.5 overflow-hidden"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
            >
              <div className="flex items-center gap-3 px-4 py-3.5 relative">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-sm text-gray-500 flex-shrink-0">
                  ID
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className="truncate"
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: item.checked ? "#9CA3AF" : "#111827",
                      textDecoration: item.checked ? "line-through" : "none",
                    }}
                  >
                    {item.productId}
                  </p>
                  <span className="text-gray-400" style={{ fontSize: 12 }}>
                    {item.checked ? "Comprado" : "Por comprar"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => void deleteItem(item.productId)}
                    disabled={isSaving}
                    className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center disabled:opacity-60"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                  <motion.button
                    onClick={() => void toggleItem(item.productId)}
                    disabled={isSaving}
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center disabled:opacity-60"
                    animate={{
                      borderColor: item.checked ? "#10B981" : "#D1D5DB",
                      backgroundColor: item.checked ? "#10B981" : "white",
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <AnimatePresence>
                      {item.checked && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Check className="w-3 h-3 text-white" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!visibleItems.length && (
          <div className="bg-white rounded-2xl p-4" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <p className="text-gray-500" style={{ fontSize: 13 }}>
              {searchInput ? "Nenhum item encontrado para esse filtro." : "Esta lista ainda nao tem itens."}
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-5 py-3 bg-white border-t border-gray-100"
          >
            <div className="flex gap-2">
              <input
                value={addInput}
                onChange={(event) => setAddInput(event.target.value)}
                placeholder="Adicionar productId..."
                autoFocus
                onKeyDown={(event) => event.key === "Enter" && void addItem()}
                className="flex-1 bg-gray-50 px-4 py-3 rounded-xl outline-none"
                style={{ fontSize: 14 }}
              />
              <button
                onClick={() => void addItem()}
                disabled={isSaving}
                className="px-4 py-3 bg-indigo-600 rounded-xl disabled:opacity-60"
                style={{ fontSize: 13, fontWeight: 600, color: "white" }}
              >
                Add
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-24 right-5">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowAdd((current) => !current)}
          disabled={!activeList}
          className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center shadow-xl disabled:opacity-60"
        >
          <motion.div animate={{ rotate: showAdd ? 45 : 0 }}>
            <Plus className="w-6 h-6 text-white" />
          </motion.div>
        </motion.button>
      </div>
    </div>
  );
}
