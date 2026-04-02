import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, ChevronRight, Check, Search, ShoppingCart, RefreshCw } from "lucide-react";
import { AddProductModal } from "../modals/AddProductModal";
import { useLists, ListResponse, ListItemResponse, ListItemRequest } from "../../../api/useLists";
import { useProducts, Product } from "../../../api/useProducts";
import { useStores, StoreResponse } from "../../../api/useStores";

interface EnrichedItem extends ListItemResponse {
  name: string;
  emoji: string;
  storeName: string;
}

export function ListsScreen({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { getLists, getList, createList, updateList } = useLists();
  const { getProductsByIds } = useProducts();
  const { getStores } = useStores();

  const [lists, setLists] = useState<ListResponse[]>([]);
  const [items, setItems] = useState<EnrichedItem[]>([]);
  const [view, setView] = useState<"lists" | "items">("lists");
  const [activeListId, setActiveListId] = useState<string | null>(null);
  
  const [searchInput, setSearchInput] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);

  const activeList = useMemo(() => lists.find(l => l.id === activeListId) || null, [lists, activeListId]);

  const loadLists = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getLists();
      setLists(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [getLists]);

  useEffect(() => {
    if (view === "lists") {
      loadLists();
    }
  }, [loadLists, view]);

  const loadItems = useCallback(async (listId: string) => {
    setIsLoading(true);
    try {
      const listData = await getList(listId);
      const rawItems = listData.items || [];
      
      const productIds = Array.from(new Set(rawItems.map(i => i.productId)));
      const storeIds = Array.from(new Set(rawItems.map(i => i.storeId)));
      
      let productsMap: Record<string, Product> = {};
      let storesMap: Record<string, StoreResponse> = {};
      
      if (productIds.length > 0) {
         try {
           const prods = await getProductsByIds(productIds);
           prods.forEach(p => productsMap[p.id] = p);
         } catch(e) { console.error("Failed to load products", e); }
      }
      
      if (storeIds.length > 0) {
         try {
           const stores = await getStores({ ids: storeIds.join(',') });
           stores.forEach(s => storesMap[s.id] = s);
         } catch(e) { console.error("Failed to load stores", e); }
      }

      const enriched = rawItems.map(item => ({
        ...item,
        name: productsMap[item.productId]?.name || "Unknown Product",
        emoji: (productsMap[item.productId] as any)?.emoji || "📦",
        storeName: storesMap[item.storeId]?.name || "Unknown Store"
      }));
      
      // Keep lists up to date local
      setLists(prev => prev.map(l => l.id === listId ? { ...l, ...listData } : l));
      setItems(enriched);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [getList, getProductsByIds, getStores]);

  useEffect(() => {
    if (activeListId && view === "items") {
      loadItems(activeListId);
    }
  }, [activeListId, view, loadItems]);

  const commitUpdates = async (listId: string, updatedItems: EnrichedItem[]) => {
    try {
      const mappedRequest: ListItemRequest[] = updatedItems.map(i => ({
        productId: i.productId,
        storeId: i.storeId,
        quantity: i.quantity,
        price: i.price,
        checked: i.checked
      }));
      await updateList(listId, undefined, mappedRequest);
    } catch(e) {
      console.error(e);
      // rollback could be applied here
    }
  };

  const handleToggleItem = (id: number) => {
    if (!activeListId) return;
    const newItems = items.map(i => i.id === id ? { ...i, checked: !i.checked } : i);
    setItems(newItems);
    commitUpdates(activeListId, newItems);
  };

  const handleDeleteItem = (id: number) => {
    if (!activeListId) return;
    const newItems = items.filter(i => i.id !== id);
    setItems(newItems);
    commitUpdates(activeListId, newItems);
  };

  const handleAddItem = (addedItem: any) => {
    if (!activeListId) return;
    const newItem: EnrichedItem = {
      id: Date.now(), // Optimistic ID
      productId: addedItem.productId,
      storeId: addedItem.storeId,
      quantity: addedItem.quantity,
      price: addedItem.price,
      checked: addedItem.checked,
      name: addedItem.name,
      emoji: addedItem.emoji,
      storeName: addedItem.storeName
    };
    
    const newItems = [...items, newItem];
    setItems(newItems);
    commitUpdates(activeListId, newItems);
  };

  const handleCreateList = async () => {
    const listName = window.prompt("Nome da nova lista:");
    if (!listName?.trim()) return;
    
    setIsLoading(true);
    try {
      const newList = await createList(listName.trim());
      setLists(prev => [newList, ...prev]);
      setActiveListId(newList.id);
      setView("items");
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchInput.trim()) return items;
    return items.filter(i => i.name.toLowerCase().includes(searchInput.toLowerCase()));
  }, [items, searchInput]);

  const total = items.filter(i => !i.checked).reduce((s, i) => s + (i.price * i.quantity), 0);
  const checkedCount = items.filter(i => i.checked).length;

  if (view === "lists") {
    return (
      <div className="flex flex-col h-full bg-[#F8F9FC]">
        <div className="px-5 pt-12 pb-4 bg-white flex justify-between items-center">
          <div>
            <h1 className="text-gray-900 mb-1" style={{ fontSize: 24, fontWeight: 700 }}>Minhas Listas</h1>
            <p className="text-gray-400" style={{ fontSize: 14 }}>Gere as tuas compras</p>
          </div>
          <button onClick={loadLists} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
             <RefreshCw className={`w-5 h-5 text-gray-500 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && lists.length === 0 ? (
            <div className="bg-white rounded-3xl p-5" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              <p className="text-gray-500" style={{ fontSize: 14 }}>A carregar listas...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mb-6">
              {lists.map((list, i) => {
                 // API ListResponse only gives count. Or calculates local.
                 return (
                  <motion.div
                    key={list.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="bg-white rounded-3xl p-5 cursor-pointer"
                    style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setActiveListId(list.id); setView("items"); }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#EEF2FF]">
                          <ShoppingCart className="w-5 h-5 text-[#6366F1]" />
                        </div>
                        <div>
                          <p className="text-gray-900" style={{ fontSize: 15, fontWeight: 700 }}>{list.name}</p>
                          <p className="text-gray-400" style={{ fontSize: 12 }}>{list.items?.length || 0} items</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 mt-1" />
                    </div>
                  </motion.div>
                 );
              })}

              {!lists.length && (
                 <div className="bg-white rounded-3xl p-5" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
                  <p className="text-gray-500" style={{ fontSize: 14 }}>Ainda nao tens listas.</p>
                 </div>
              )}
            </div>
          )}

          <motion.button
            onClick={handleCreateList}
            whileTap={{ scale: 0.97 }}
            className="w-full py-4 rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5 text-gray-400" />
            <span className="text-gray-400" style={{ fontSize: 14, fontWeight: 600 }}>Create New List</span>
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F8F9FC]">
      <div className="px-5 pt-12 pb-4 bg-white shadow-sm z-10 relative">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setView("lists")}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4 text-gray-500 rotate-180" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-gray-900 truncate" style={{ fontSize: 20, fontWeight: 700 }}>{activeList?.name || "Lista"}</h1>
          </div>
          <button onClick={() => loadItems(activeListId!)} className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
            <RefreshCw className={`w-4 h-4 text-indigo-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-500 rounded-full"
              animate={{ width: items.length ? `${(checkedCount / items.length) * 100}%` : '0%' }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <span className="text-gray-500" style={{ fontSize: 12, fontWeight: 600 }}>
            {checkedCount}/{items.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
              placeholder="Search items..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 bg-transparent outline-none text-gray-700" 
              style={{ fontSize: 13 }} 
            />
          </div>
          <div className="bg-indigo-50 rounded-xl px-3 py-2.5">
            <span style={{ fontSize: 13, fontWeight: 700, color: "#6366F1" }}>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3 pt-4">
        {isLoading && items.length === 0 ? (
          <div className="bg-white rounded-2xl p-4" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <p className="text-gray-500 text-center" style={{ fontSize: 13 }}>A carregar itens e dependencias...</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="bg-white rounded-2xl mb-2.5 overflow-hidden"
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
              >
                <div className="flex items-center gap-3 px-4 py-3.5 relative">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">
                    {item.emoji || "📦"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="truncate"
                      style={{
                        fontSize: 14, fontWeight: 600,
                        color: item.checked ? "#9CA3AF" : "#111827",
                        textDecoration: item.checked ? "line-through" : "none",
                      }}
                    >
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400" style={{ fontSize: 12 }}>
                        {item.quantity} un
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="text-gray-400 truncate" style={{ fontSize: 12 }}>{item.storeName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 14, fontWeight: 700, color: item.checked ? "#9CA3AF" : "#10B981" }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                    <motion.button
                      onClick={() => handleToggleItem(item.id)}
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                      animate={{
                        borderColor: item.checked ? "#10B981" : "#D1D5DB",
                        backgroundColor: item.checked ? "#10B981" : "white",
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <AnimatePresence>
                        {item.checked && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
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
        )}
        
        {!isLoading && filteredItems.length === 0 && (
          <div className="bg-white rounded-2xl p-4" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <p className="text-gray-500 text-center" style={{ fontSize: 13 }}>Nenhum item adicionado.</p>
          </div>
        )}
      </div>

      <div className="absolute bottom-24 right-5">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowAddModal(true)}
          className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center shadow-xl"
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      <AddProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddItem={handleAddItem}
      />
    </div>
  );
}
