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
  imageSrc?: string;
}

const getProductImageSrc = (product: Product) => {
  const imageValue = product.image?.trim();
  if (!imageValue) return undefined;
  if (/^(https?:|data:|blob:|\/)/i.test(imageValue)) return imageValue;
  return undefined;
};

export function ListScreen({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();

  const { getList, updateList, removeList } = useLists();
  const { getProductsByIds } = useProducts();
  const { getStores } = useStores();

  const [listDetails, setListDetails] = useState<ListResponse | null>(null);
  const [items, setItems] = useState<EnrichedItem[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  
  const [searchInput, setSearchInput] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
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

      const enriched = rawItems.map(item => {
      const product = productsMap[item.productId];

      return {
        ...item,
        name: product?.name || "Unknown Product",
        emoji: (product as any)?.emoji || "📦",
        imageSrc: product ? getProductImageSrc(product) : undefined,
        storeName: storesMap[item.storeId]?.name || "Unknown Store"
      };
    })
      
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

  const handleEditName = async () => {
    if (!listId || !newName.trim()) return;
    
    setIsLoading(true);
    try {
      await updateList(listId, newName.trim(),  []);
      setListDetails(prev => prev ? { ...prev, name: newName.trim() } : null);
      setEditingName(false);
      setNewName("");
    } catch(e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteList = async () => {
    if (!listId) return;
    
    setIsLoading(true);
    try {
      await removeList(listId);
      setDeleteConfirm(false);
      navigate("/lists");
    } catch(e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

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
    }
  };

  const handleToggleItem = (id: number) => {
    if (!listId) return;
    const newItems = items.map(i => i.id === id ? { ...i, checked: !i.checked } : i);
    setItems(newItems);
    commitUpdates(listId, newItems);
  };

  
  // ...existing code...
  const handleDeleteItem = (id: number) => {
    if (!listId) return;
    const newItems = items.filter(i => i.id !== id);
    setItems(newItems);
    commitUpdates(listId, newItems);
  };

  // ...existing code...
const handleAddItem = async (addedItem: any) => {
    if (!listId) return;

    let name = addedItem.name || "Unknown Product";
    let emoji = addedItem.emoji || "📦";
    let storeName = addedItem.storeName || "Unknown Store";

    const rawImage = typeof addedItem?.image === "string" ? addedItem.image.trim() : "";
    let imageSrc = /^(https?:|data:|blob:|\/)/i.test(rawImage) ? rawImage : undefined;

    if ((!imageSrc || !addedItem.name || !addedItem.emoji) && addedItem.productId) {
      try {
        const products = await getProductsByIds([addedItem.productId]);
        const product = products?.[0];
        if (product) {
          name = product.name || name;
          emoji = (product as any)?.emoji || emoji;
          imageSrc = getProductImageSrc(product) || imageSrc;
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (!addedItem.storeName && addedItem.storeId) {
      try {
        const stores = await getStores({ ids: addedItem.storeId });
        if (stores?.[0]?.name) storeName = stores[0].name;
      } catch (e) {
        console.error(e);
      }
    }

    const newItem: EnrichedItem = {
      id: Date.now(),
      productId: addedItem.productId,
      storeId: addedItem.storeId,
      quantity: addedItem.quantity,
      price: addedItem.price,
      checked: addedItem.checked,
      name,
      emoji,
      imageSrc,
      storeName,
    };

    setItems((prev) => {
      const next = [...prev, newItem];
      void commitUpdates(listId, next);
      return next;
    });
  };
// ...existing code...
  

  const handleChangeQuantity = (id: number, delta: number) => {
    if (!listId) return;

    const newItems = items.map((i) => {
      if (i.id !== id) return i;
      const nextQty = Math.max(1, i.quantity + delta); // mínimo 1
      return { ...i, quantity: nextQty };
    });

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
      <div className="bg-white shadow-sm z-10 relative">
        <div className="max-w-5xl mx-auto w-full px-5 lg:px-8 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => onNavigate ? onNavigate("lists") : navigate("/lists")}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4 text-gray-500 rotate-180" />
          </button>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleEditName}
                onKeyPress={(e) => e.key === "Enter" && handleEditName()}
                style={{ fontSize: 20, fontWeight: 700 }}
                className="w-full bg-transparent outline-none text-gray-900 border-b-2 border-indigo-600"
              />
            ) : (
              <button
                onClick={() => {
                  setEditingName(true);
                  setNewName(listDetails?.name || "");
                }}
                className="text-gray-900 truncate hover:text-indigo-600 transition-colors"
                style={{ fontSize: 20, fontWeight: 700 }}
              >
                {listDetails?.name || "Lista"}
              </button>
            )}
          </div>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
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
            <span style={{ fontSize: 13, fontWeight: 700, color: "#6366F1" }}>€{total.toFixed(2)}</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white shadow-sm"
            style={{ fontSize: 13, fontWeight: 700 }}
            type="button"
          >
            <Plus className="w-4 h-4 text-white" />
            Add item
          </motion.button>
        </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto w-full px-5 lg:px-8 py-4">
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
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.imageSrc ? (
                      <img
                        src={item.imageSrc}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xl">{item.emoji || "📦"}</span>
                    )}
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
                  <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-1 py-0.5">
                    <button
                      onClick={() => handleChangeQuantity(item.id, -1)}
                      className="w-5 h-5 rounded-md flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-40"
                      disabled={item.quantity <= 1}
                      aria-label="Diminuir quantidade"
                      type="button"
                    >
                      -
                    </button>

                    <span className="text-gray-500 min-w-[22px] text-center" style={{ fontSize: 12 }}>
                      {item.quantity}
                    </span>

                    <button
                      onClick={() => handleChangeQuantity(item.id, 1)}
                      className="w-5 h-5 rounded-md flex items-center justify-center text-gray-600 hover:bg-gray-200"
                      aria-label="Aumentar quantidade"
                      type="button"
                    >
                      +
                    </button>
                  </div>

                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span className="text-gray-400 truncate" style={{ fontSize: 12 }}>
                    {item.storeName}
                  </span>
                </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 14, fontWeight: 700, color: item.checked ? "#9CA3AF" : "#10B981" }}>
                      €{(item.price * item.quantity).toFixed(2)}
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
      </div>

      <div className="fixed bottom-6 right-6 md:hidden">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowAddModal(true)}
          className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center shadow-xl"
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      {deleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          onClick={() => setDeleteConfirm(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-3xl p-6 w-80 flex flex-col gap-4 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-gray-900" style={{ fontSize: 16, fontWeight: 700 }}>Apagar lista?</p>
              <p className="text-gray-400 mt-2" style={{ fontSize: 13 }}>Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteList}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                Apagar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <AddProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddItem={handleAddItem}
      />
    </div>
  );
}
