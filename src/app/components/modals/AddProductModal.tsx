import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Type, Grid3x3, Search, ChevronLeft, ChevronRight, Loader, Store } from "lucide-react";
import { useProducts, Product, Category } from "../../../api/useProducts";
import { useStores, StoreResponse } from "../../../api/useStores";
import { usePrices, PriceResponse } from "../../../api/usePrices";
import { ImageWithFallback } from "../fallback/ImageWithFallback";

type InputMethod = "text" | "category";

const categoryImageModules = import.meta.glob("../../../../image/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const normalizeImageName = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const categoryImageByName = Object.entries(categoryImageModules).reduce<Record<string, string>>(
  (acc, [path, url]) => {
    const fileName = path.split(/[/\\]/).pop() ?? "";
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    if (baseName) {
      acc[normalizeImageName(baseName)] = url;
    }
    return acc;
  },
  {},
);

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: any) => void;
}

export function AddProductModal({ isOpen, onClose, onAddItem }: AddProductModalProps) {
  const { searchProducts, getMainCategories, getSubCategories, getProductsByCategory } = useProducts();
  const { getStores } = useStores();
  const { getPrices } = usePrices();

  const [method, setMethod] = useState<InputMethod>("text");
  const [searchInput, setSearchInput] = useState("");
  
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<Category | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [addedCount, setAddedCount] = useState(0);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  
  const [storeSearch, setStoreSearch] = useState("");
  const [allStores, setAllStores] = useState<StoreResponse[]>([]);
  const [productPrices, setProductPrices] = useState<PriceResponse[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStore, setIsLoadingStore] = useState(false);

  const getCategoryImageSrc = (category: Category) => {
    const imageValue = category.image?.trim();
    if (imageValue && /^(https?:|data:|blob:|\/)/i.test(imageValue)) {
      return imageValue;
    }
    const rawName = imageValue || category.name;
    if (!rawName) return undefined;
    const normalized = normalizeImageName(rawName.replace(/\.[^/.]+$/, ""));
    return categoryImageByName[normalized];
  };

  const getProductImageSrc = (product: Product) => {
    const imageValue = product.image?.trim();
    if (!imageValue) return undefined;
    if (/^(https?:|data:|blob:|\/)/i.test(imageValue)) return imageValue;
    return undefined;
  };

  useEffect(() => {
    if (method === "category" && categories.length === 0) {
      loadCategories();
    }
  }, [method, categories.length]);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const data = await getMainCategories();
      setCategories(data || []);
    } catch(e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (method !== "text") return;
    if (!searchInput.trim()) {
      setProducts([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchProducts(searchInput);
        setProducts(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput, method, searchProducts]);

  useEffect(() => {
    if (selectedCategory) {
      const fetchSubCats = async () => {
        setIsLoading(true);
        try {
          const data = await getSubCategories(selectedCategory.id);
          setSubCategories(data || []);
        } catch(e) {
           console.error(e);
        } finally {
           setIsLoading(false);
        }
      };
      setSelectedSubCategory(null);
      setSubCategories([]);
      setProducts([]);
      fetchSubCats();
    } else {
      if (method === "category") {
        setSubCategories([]);
        setProducts([]);
      }
    }
  }, [selectedCategory, getSubCategories, method]);

  useEffect(() => {
    if (selectedSubCategory) {
      const fetchSubCatProducts = async () => {
        setIsLoading(true);
        try {
          const data = await getProductsByCategory(selectedSubCategory.id);
          setProducts(data || []);
        } catch(e) {
           console.error(e);
        } finally {
           setIsLoading(false);
        }
      };
      fetchSubCatProducts();
    } else if (selectedCategory && method === "category") {
      setProducts([]);
    }
  }, [selectedSubCategory, getProductsByCategory, method, selectedCategory]);

  useEffect(() => {
    if (selectedProduct) {
      const fetchStoresAndPrices = async () => {
        setIsLoadingStore(true);
        try {
          const pricesRes = await getPrices(selectedProduct.id);
          setProductPrices(pricesRes || []);
          
          if (pricesRes && pricesRes.length > 0) {
            const storeIds = pricesRes.map(p => p.storeId).join(',');
            const storesRes = await getStores({ ids: storeIds });
            setAllStores(storesRes || []);
          } else {
            setAllStores([]);
          }
        } catch(e) {
          console.error(e);
        } finally {
          setIsLoadingStore(false);
        }
      };
      
      setStoreSearch(""); // reset store search
      fetchStoresAndPrices();
    }
  }, [selectedProduct, getStores, getPrices]);

  useEffect(() => {
    if (!selectedProduct || !storeSearch.trim()) return;
    const timer = setTimeout(async () => {
      setIsLoadingStore(true);
      try {
        const storesRes = await getStores({ name: storeSearch.trim() });
        setAllStores(storesRes || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingStore(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [storeSearch, selectedProduct, getStores]);

  const handleReset = () => {
    setMethod("text");
    setSearchInput("");
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setSelectedProduct(null);
    setAddedCount(0);
    setProducts([]);
    setSubCategories([]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleStoreSelect = (store: StoreResponse) => {
    if (!selectedProduct) return;
    
    const knownPrice = productPrices.find(p => p.storeId === store.id);
    const hasSale = typeof knownPrice?.sale === "number" && knownPrice.sale > 0;
    const price = knownPrice
      ? (typeof knownPrice.sale === "number" && knownPrice.sale > 0 ? knownPrice.sale : knownPrice.price)
      : 0;

    onAddItem({
      productId: selectedProduct.id,
      storeId: store.id,
      quantity: 1,
      price: price,
      originalPrice: hasSale ? knownPrice?.price : undefined,
      checked: false,
      name: selectedProduct.name,
      emoji: selectedProduct.emoji || "📦",
      storeName: store.name,
    });
    
    setAddedCount(prev => prev + 1);
    setTimeout(() => {
      setSelectedProduct(null);
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="w-full sm:max-w-3xl bg-white rounded-3xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {(selectedCategory || selectedSubCategory || selectedProduct) && (
              <button
                onClick={() => {
                  if (selectedProduct) setSelectedProduct(null);
                  else if (selectedSubCategory) setSelectedSubCategory(null);
                  else if (selectedCategory) setSelectedCategory(null);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
            )}
            <div>
              <h2 className="text-gray-900" style={{ fontSize: 18, fontWeight: 700 }}>
                {selectedProduct
                  ? "Escolher Loja"
                  : selectedSubCategory
                    ? selectedSubCategory.name
                    : selectedCategory
                      ? selectedCategory.name
                      : "Add Product"}
              </h2>
              {addedCount > 0 && !selectedProduct && (
                <p className="text-green-600" style={{ fontSize: 12, fontWeight: 600 }}>
                  {addedCount} {addedCount === 1 ? "item" : "items"} added
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {selectedProduct ? (
            <AnimatePresence mode="wait">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl shadow-sm">
                    {getProductImageSrc(selectedProduct) ? (
                      <ImageWithFallback
                        src={getProductImageSrc(selectedProduct)}
                        alt={selectedProduct.name}
                        className="w-16 h-16 object-cover rounded-2xl"
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                      />
                    ) : (
                      selectedProduct.emoji || "📦"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900 font-bold text-lg truncate">{selectedProduct.name}</h3>
                    <p className="text-gray-500 text-sm">Onde vais comprar?</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 mb-4">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    placeholder="Pesquisar loja..."
                    autoFocus
                    className="flex-1 bg-transparent outline-none text-gray-900"
                    style={{ fontSize: 13 }}
                  />
                </div>

                <div className="space-y-3">
                  {isLoadingStore ? (
                    <div className="flex justify-center py-8"><Loader className="w-8 h-8 animate-spin text-indigo-500" /></div>
                  ) : allStores.map(store => {
                    const priceMatch = productPrices.find(p => p.storeId === store.id);
                    const hasSale = typeof priceMatch?.sale === "number" && priceMatch.sale > 0;
                    const displayPrice = hasSale ? (priceMatch?.sale ?? 0) : (priceMatch?.price ?? 0);
                    return (
                      <motion.button
                        key={store.id}
                        onClick={() => handleStoreSelect(store)}
                        className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all"
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                            <Store className="w-5 h-5 text-indigo-600" />
                          </div>
                          <span className="font-semibold text-gray-900">{store.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="block font-bold text-gray-900">
                            {priceMatch ? `${displayPrice.toFixed(2)} €` : "Indefinido"}
                          </span>
                          {hasSale && priceMatch && (
                            <span className="block text-gray-400" style={{ fontSize: 12, textDecoration: "line-through" }}>
                              {priceMatch.price.toFixed(2)} €
                            </span>
                          )}
                        </div>
                      </motion.button>
                    )
                  })}

                  {!isLoadingStore && allStores.length === 0 && (
                     <p className="text-center text-gray-500">Nenhuma loja disponivel no sistema.</p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <>
              {!selectedCategory && (
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setMethod("text")}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all"
                    style={{
                      backgroundColor: method === "text" ? "#EEF2FF" : "#F3F4F6",
                      color: method === "text" ? "#6366F1" : "#6B7280",
                    }}
                  >
                    <Type className="w-4 h-4" />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Search</span>
                  </button>
                  <button
                    onClick={() => setMethod("category")}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all"
                    style={{
                      backgroundColor: method === "category" ? "#ECFDF5" : "#F3F4F6",
                      color: method === "category" ? "#10B981" : "#6B7280",
                    }}
                  >
                    <Grid3x3 className="w-4 h-4" />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Category</span>
                  </button>
                </div>
              )}

              <AnimatePresence mode="wait">
                {method === "text" && !selectedCategory && (
                  <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 mb-3">
                      <Search className="w-4 h-4 text-gray-400" />
                      <input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Pesquisar por nome..."
                        autoFocus
                        className="flex-1 bg-transparent outline-none text-gray-900"
                        style={{ fontSize: 14 }}
                      />
                    </div>

                    <div className="space-y-2">
                      {isLoading ? (
                        <div className="flex justify-center py-4"><Loader className="w-6 h-6 animate-spin text-indigo-400" /></div>
                      ) : products.length > 0 ? (
                        products.map((product) => (
                          <motion.button
                            key={product.id}
                            onClick={() => handleProductClick(product)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-gray-50"
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-lg shadow-sm">
                              {getProductImageSrc(product) ? (
                                <ImageWithFallback
                                  src={getProductImageSrc(product)}
                                  alt={product.name}
                                  className="w-10 h-10 object-cover rounded-lg"
                                  loading="lazy"
                                  decoding="async"
                                  fetchPriority="low"
                                />
                              ) : (
                                product.emoji || "📦"
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-gray-900" style={{ fontSize: 14, fontWeight: 600 }}>{product.name}</p>
                              <p className="text-gray-500" style={{ fontSize: 12 }}>Clica para escolher loja</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300" />
                          </motion.button>
                        ))
                      ) : searchInput.length > 0 ? (
                         <p className="text-center text-gray-400 py-4" style={{fontSize: 13}}>Nenhum produto encontrado.</p>
                      ) : null}
                    </div>
                  </motion.div>
                )}

                {method === "category" && !selectedCategory && (
                  <motion.div key="category" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {isLoading ? (
                        <div className="flex justify-center py-4"><Loader className="w-6 h-6 animate-spin text-green-400" /></div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {categories.map((cat) => {
                          const imageSrc = getCategoryImageSrc(cat);
                          return (
                            <button
                              key={cat.id}
                              onClick={() => {
                                setSelectedCategory(cat);
                                setSelectedSubCategory(null);
                                setSubCategories([]);
                                setProducts([]);
                              }}
                              className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                              {imageSrc ? (
                                <img
                                  src={imageSrc}
                                  alt={cat.name}
                                  className="w-12 h-12 object-cover rounded-lg bg-white shadow-sm"
                                  loading="lazy"
                                  decoding="async"
                                  fetchPriority="low"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center shadow-sm">📦</div>
                              )}
                              <p className="text-gray-900 text-center line-clamp-1" style={{ fontSize: 12, fontWeight: 600 }}>{cat.name}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {method === "category" && selectedCategory && !selectedSubCategory && (
                  <motion.div key={`subcategory-${selectedCategory.id}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    {isLoading ? (
                      <div className="flex justify-center py-4"><Loader className="w-6 h-6 animate-spin text-green-400" /></div>
                    ) : subCategories.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {subCategories.map((subCat) => {
                          const imageSrc = getCategoryImageSrc(subCat);
                          return (
                            <button
                              key={subCat.id}
                              onClick={() => setSelectedSubCategory(subCat)}
                              className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                              {imageSrc ? (
                                <img
                                  src={imageSrc}
                                  alt={subCat.name}
                                  className="w-12 h-12 object-cover rounded-lg bg-white shadow-sm"
                                  loading="lazy"
                                  decoding="async"
                                  fetchPriority="low"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center shadow-sm">📦</div>
                              )}
                              <p className="text-gray-900 text-center line-clamp-1" style={{ fontSize: 12, fontWeight: 600 }}>{subCat.name}</p>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-gray-400 py-4" style={{fontSize: 13}}>Sem subcategorias.</p>
                    )}
                  </motion.div>
                )}

                {selectedSubCategory && (
                  <motion.div key={`subcategory-products-${selectedSubCategory.id}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="space-y-2">
                      {isLoading ? (
                         <div className="flex justify-center py-4"><Loader className="w-6 h-6 animate-spin text-green-400" /></div>
                      ) : products.map((product) => (
                        <motion.button
                          key={product.id}
                          onClick={() => handleProductClick(product)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-gray-50"
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-lg shadow-sm">
                            {getProductImageSrc(product) ? (
                              <ImageWithFallback
                                src={getProductImageSrc(product)}
                                alt={product.name}
                                className="w-10 h-10 object-cover rounded-lg"
                                loading="lazy"
                                decoding="async"
                                fetchPriority="low"
                              />
                            ) : (
                              product.emoji || "📦"
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-gray-900" style={{ fontSize: 14, fontWeight: 600 }}>{product.name}</p>
                            <p className="text-gray-500" style={{ fontSize: 12 }}>Clica para escolher loja</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
