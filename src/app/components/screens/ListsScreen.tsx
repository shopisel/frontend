import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Plus, ChevronRight, ShoppingCart, RefreshCw, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLists, ListResponse } from "../../../api/useLists";

export function ListsScreen({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { getLists, createList, removeList } = useLists();
  const navigate = useNavigate();

  const [lists, setLists] = useState<ListResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const handleDeleteList = async (listId: string) => {
    setIsLoading(true);
    try {
      await removeList(listId);
      setLists(prev => prev.filter(list => list.id !== listId));
      setDeleteConfirm(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  

  // ...existing code...
  return (
    <div className="flex flex-col h-full bg-[#F8F9FC]">
      <div className="bg-white">
        <div className="max-w-6xl w-full px-5 lg:px-8 pt-6 pb-4">
          <div>
            <h1 className="text-gray-900 mb-1" style={{ fontSize: 24, fontWeight: 700 }}>
              Minhas Listas
            </h1>
            <p className="text-gray-400" style={{ fontSize: 14 }}>
              Gere as tuas compras
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl w-full px-5 lg:px-8 py-5">
          {isLoading && lists.length === 0 ? (
            <div className="bg-white rounded-3xl p-5" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              <p className="text-gray-500" style={{ fontSize: 14 }}>
                A carregar listas...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
              {lists.map((list, i) => {
                return (
                  <motion.div
                    key={list.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-3xl p-5 cursor-pointer"
                    style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => navigate(`/lists/${list.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#EEF2FF]">
                          <ShoppingCart className="w-5 h-5 text-[#6366F1]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-gray-900 truncate" style={{ fontSize: 15, fontWeight: 700 }}>
                            {list.name}
                          </p>
                          <p className="text-gray-400" style={{ fontSize: 12 }}>
                            {list.items?.length || 0} items
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(list.id);
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                        <ChevronRight className="w-5 h-5 text-gray-300 mt-1" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {!lists.length && (
                <div className="bg-white rounded-3xl p-5" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
                  <p className="text-gray-500" style={{ fontSize: 14 }}>
                    Ainda nao tens listas.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <motion.button
        onClick={loadLists}
        whileTap={{ scale: 0.95 }}
        className="fixed top-4 right-4 z-40 w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center"
        aria-label="Atualizar listas"
      >
        <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoading ? "animate-spin" : ""}`} />
      </motion.button>

      <motion.button
        onClick={handleCreateList}
        whileTap={{ scale: 0.95 }}
        className="fixed right-5 bottom-24 md:bottom-6 z-40 w-14 h-14 rounded-full bg-blue-600 shadow-lg flex items-center justify-center"
        aria-label="Criar nova lista"
      >
        <Plus className="w-7 h-7 text-white" />
      </motion.button>

      {deleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          onClick={() => setDeleteConfirm(null)}
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
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteList(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                Apagar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
