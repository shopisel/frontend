import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Plus, ChevronRight, ShoppingCart, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLists, ListResponse } from "../../../api/useLists";

export function ListsScreen({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { getLists, createList } = useLists();
  const navigate = useNavigate();

  const [lists, setLists] = useState<ListResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
    loadLists();
  }, [loadLists]);

  const handleCreateList = async () => {
    const listName = window.prompt("Nome da nova lista:");
    if (!listName?.trim()) return;
    
    setIsLoading(true);
    try {
      const newList = await createList(listName.trim());
      setLists(prev => [newList, ...prev]);
      navigate(`/lists/${newList.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8F9FC]">
      <div className="px-5 pt-6 pb-4 bg-white flex justify-between items-center">
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
               return (
                <motion.div
                  key={list.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white rounded-3xl p-5 cursor-pointer"
                  style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/lists/${list.id}`)}
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
