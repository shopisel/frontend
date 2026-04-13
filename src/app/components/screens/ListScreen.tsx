import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, ChevronRight, Check, Search, RefreshCw } from "lucide-react";
import { AddProductModal } from "../modals/AddProductModal";
import { useParams, useNavigate } from "react-router-dom";
import { useLists, ListResponse, ListItemResponse, ListItemRequest } from "../../../api/useLists";
import { useProducts, Product } from "../../../api/useProducts";
import { useStores, StoreResponse } from "../../../api/useStores";

interface EnrichedItem extends ListItemResponse {
  name: string;
  emoji: string;
  storeName: string;
}

export function ListScreen({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();

  const { getList, updateList } = useLists();
  const { getProductsByIds } = useProducts();
  const { getStores } = useStores();

  const [listDetails, setListDetails] = useState<ListResponse | null>(null);
  const [items, setItems] = useState<EnrichedItem[]>([]);
  
  const [searchInput, setSearchInput] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);

  const loadItems = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const listData = await getList(id);
      setListDetails(listData);
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
      
      setItems(enriched);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [getList, getProductsByIds, getStores]);

  useEffect(() => {
    if (listId) {
      loadItems(listId);
    }
  }, [listId, loadItems]);

  const commitUpdates = async (id: string, updatedItems: EnrichedItem[]) => {
    try {
      const mappedRequest: ListItemRequest[] = updatedItems.map(i => ({
        productId: i.productId,
        storeId: i.storeId,
        quantity: i.quantity,
        price: i.price,
        checked: i.checked
      }));
      await updateList(id, undefined, mappedRequest);
    } catch(e) {
      console.error(e);
      // rollback could be applied here
    }
  };

  const handleToggleItem = (id: number) => {
    if (!listId) return;
    const newItems = items.map(i => i.id === id ? { ...i, checked: !i.checked } : i);
    setItems(newItems);
    commitUpdates(listId, newItems);
  };

  const handleDeleteItem = (id: number) => {
    if (!listId) return;
    const newItems = items.filter(i => i.id !== id);
    setItems(newItems);
    commitUpdates(listId, newItems);
  };

  const handleAddItem = (addedItem: any) => {
    if (!listId) return;
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
    commitUpdates(listId, newItems);
  };

  const filteredItems = useMemo(() => {
    if (!searchInput.trim()) return items;
    return items.filter(i => i.name.toLowerCase().includes(searchInput.toLowerCase()));
  }, [items, searchInput]);

  const total = items.filter(i => !i.checked).reduce((s, i) => s + (i.price * i.quantity), 0);
  const checkedCount = items.filter(i => i.checked).length;

  return (
    <div className="flex flex-col h-full bg-[#F8F9FC]">
      <div className="px-5 pt-6 pb-4 bg-white shadow-sm z-10 relative">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => onNavigate ? onNavigate("lists") : navigate("/lists")}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4 text-gray-500 rotate-180" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-gray-900 truncate" style={{ fontSize: 20, fontWeight: 700 }}>{listDetails?.name || "Lista"}</h1>
          </div>
          <button onClick={() => { if(listId) loadItems(listId); }} className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
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

      <div className="absolute bottom-6 right-6">
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
