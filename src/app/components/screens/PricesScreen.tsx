import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Search, ArrowUpDown, Tag, Navigation, Loader, Star } from "lucide-react";
import { useProducts, type Category, type Product } from "../../../api/useProducts";
import { usePrices, type PriceResponse } from "../../../api/usePrices";
import { useStores } from "../../../api/useStores";
import { ImageWithFallback } from "../fallback/ImageWithFallback";

type StoreRow = {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  sale?: number;
  dist?: string;
  distKm?: number;
  rating?: number;
  promo?: string | null;
};

const getEffectivePrice = (price: PriceResponse) => {
  if (typeof price.sale === "number" && price.sale > 0) {
    return price.sale;
  }
  return price.price;
};

const getProductImageSrc = (product: Product) => {
  const imageValue = product.image?.trim();
  if (!imageValue) return undefined;
  if (/^(https?:|data:|blob:|\/)/i.test(imageValue)) return imageValue;
  return undefined;
};

type PricesScreenProps = {
  favoriteProductIds: string[];
  onToggleFavorite: (product: Product) => Promise<void>;
};

export function PricesScreen({ favoriteProductIds, onToggleFavorite }: PricesScreenProps) {
  const { searchProducts, getMainCategories, getSubCategories, getProductsByCategory } = useProducts();
  const { getPrices } = usePrices();
  const { getStores } = useStores();

  const [mainCategories, setMainCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [selectedMainCat, setSelectedMainCat] = useState<Category | null>(null);
  const [selectedSubCat, setSelectedSubCat] = useState<Category | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [storeRows, setStoreRows] = useState<StoreRow[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"price" | "distance">("price");
  const [mapView, setMapView] = useState(false);

  const [isLoadingCats, setIsLoadingCats] = useState(false);
  const [isLoadingSubCats, setIsLoadingSubCats] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [favoritePendingId, setFavoritePendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetCategorySelection = () => {
    setSelectedMainCat(null);
    setSelectedSubCat(null);
    setSubCategories([]);
  };

  const resetProductSelection = () => {
    setProducts([]);
    setSelectedProduct(null);
    setStoreRows([]);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      resetCategorySelection();
      resetProductSelection();
    }
  };

  const handleSelectMainCategory = (cat: Category | null) => {
    if (searchQuery.trim()) setSearchQuery("");
    setSelectedMainCat(cat);
  };

  const handleSelectSubCategory = (cat: Category) => {
    if (searchQuery.trim()) setSearchQuery("");
    setSelectedSubCat(cat);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoadingCats(true);
      setError(null);
      try {
        const data = await getMainCategories();
        if (cancelled) return;
        setMainCategories(data || []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load categories");
      } finally {
        if (!cancelled) setIsLoadingCats(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [getMainCategories]);

  useEffect(() => {
    let cancelled = false;

    const loadSubCats = async (mainCatId: string) => {
      setIsLoadingSubCats(true);
      setError(null);
      try {
        const data = await getSubCategories(mainCatId);
        if (cancelled) return;
        setSubCategories(data || []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load subcategories");
        setSubCategories([]);
      } finally {
        if (!cancelled) setIsLoadingSubCats(false);
      }
    };

    setSelectedSubCat(null);
    setSubCategories([]);
    resetProductSelection();

    if (selectedMainCat) {
      loadSubCats(selectedMainCat.id);
    }

    return () => {
      cancelled = true;
    };
  }, [selectedMainCat, getSubCategories]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLoadingProducts(true);
      setError(null);
      try {
        const data = await searchProducts(query);
        if (cancelled) return;
        setProducts(data || []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to search products");
        setProducts([]);
      } finally {
        if (!cancelled) setIsLoadingProducts(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, searchProducts]);

  useEffect(() => {
    if (searchQuery.trim()) return;

    let cancelled = false;
    const loadProductsForSubCat = async (subCatId: string) => {
      setIsLoadingProducts(true);
      setError(null);
      try {
        const data = await getProductsByCategory(subCatId);
        if (cancelled) return;
        setProducts(data || []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load products");
        setProducts([]);
      } finally {
        if (!cancelled) setIsLoadingProducts(false);
      }
    };

    resetProductSelection();

    if (selectedSubCat) {
      loadProductsForSubCat(selectedSubCat.id);
    }

    return () => {
      cancelled = true;
    };
  }, [selectedSubCat, searchQuery, getProductsByCategory]);

  useEffect(() => {
    if (!products.length) {
      setSelectedProduct(null);
      setStoreRows([]);
      return;
    }

    if (!selectedProduct || !products.some((p) => p.id === selectedProduct.id)) {
      setSelectedProduct(products[0]);
    }
  }, [products, selectedProduct]);

  useEffect(() => {
    if (!selectedProduct) {
      setStoreRows([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setIsLoadingStores(true);
      setError(null);
      try {
        const pricesRes = await getPrices(selectedProduct.id);
        const storeIds = Array.from(new Set((pricesRes || []).map((p) => p.storeId)));
        const storesRes = storeIds.length ? await getStores({ ids: storeIds.join(",") }) : [];
        const storeNameById = new Map((storesRes || []).map((s) => [s.id, s.name] as const));

        const rows: StoreRow[] = (pricesRes || []).map((p) => ({
          id: p.storeId,
          name: storeNameById.get(p.storeId) ?? p.storeId,
          price: getEffectivePrice(p),
          originalPrice: p.price,
          sale: p.sale,
        }));

        if (cancelled) return;
        setStoreRows(rows);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load prices");
        setStoreRows([]);
      } finally {
        if (!cancelled) setIsLoadingStores(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedProduct, getPrices, getStores]);

  const sortedStores = useMemo(() => {
    return [...storeRows].sort((a, b) => {
      if (sortBy === "price") return a.price - b.price;
      const aDist = a.distKm ?? 0;
      const bDist = b.distKm ?? 0;
      return aDist - bDist;
    });
  }, [storeRows, sortBy]);

  const savings = useMemo(() => {
    if (sortedStores.length < 2) return 0;
    return sortedStores[sortedStores.length - 1].price - sortedStores[0].price;
  }, [sortedStores]);

  const selectedProductFavorite = selectedProduct ? favoriteProductIds.includes(selectedProduct.id) : false;

  const handleToggleFavorite = async (product: Product) => {
    setFavoritePendingId(product.id);
    try {
      await onToggleFavorite(product);
    } finally {
      setFavoritePendingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8F9FC]">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 bg-white">
        <h1 className="text-gray-900 mb-1" style={{ fontSize: 24, fontWeight: 700 }}>
          Price Compare
        </h1>
        <p className="text-gray-400 mb-4" style={{ fontSize: 14 }}>
          Find the best deals nearby
        </p>

        <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search any product..."
            className="flex-1 bg-transparent outline-none text-gray-700"
            style={{ fontSize: 14 }}
          />
        </div>
      </div>

      {/* Main category filter */}
      <div className="bg-white pb-3 pt-1">
        <div className="flex gap-2 px-5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <motion.button
            key="__all__"
            onClick={() => handleSelectMainCategory(null)}
            className="flex-shrink-0 px-4 py-2 rounded-xl"
            animate={{
              backgroundColor: selectedMainCat === null ? "#6366F1" : "#F3F4F6",
              color: selectedMainCat === null ? "#FFFFFF" : "#6B7280",
            }}
            transition={{ duration: 0.2 }}
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            All
          </motion.button>

          {isLoadingCats ? (
            <div className="flex items-center gap-2 px-2 text-gray-400">
              <Loader className="w-4 h-4 animate-spin" />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Loading</span>
            </div>
          ) : (
            mainCategories.map((cat) => (
              <motion.button
                key={cat.id}
                onClick={() => handleSelectMainCategory(cat)}
                className="flex-shrink-0 px-4 py-2 rounded-xl"
                animate={{
                  backgroundColor: cat.id === selectedMainCat?.id ? "#6366F1" : "#F3F4F6",
                  color: cat.id === selectedMainCat?.id ? "#FFFFFF" : "#6B7280",
                }}
                transition={{ duration: 0.2 }}
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                {cat.name}
              </motion.button>
            ))
          )}
        </div>
      </div>

      {/* Subcategory filter */}
      {selectedMainCat && (
        <div className="bg-white pb-3">
          <div className="flex gap-2 px-5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {isLoadingSubCats ? (
              <div className="flex items-center gap-2 px-2 text-gray-400">
                <Loader className="w-4 h-4 animate-spin" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Loading</span>
              </div>
            ) : subCategories.length > 0 ? (
              subCategories.map((subCat) => (
                <motion.button
                  key={subCat.id}
                  onClick={() => handleSelectSubCategory(subCat)}
                  className="flex-shrink-0 px-4 py-2 rounded-xl"
                  animate={{
                    backgroundColor: subCat.id === selectedSubCat?.id ? "#111827" : "#F3F4F6",
                    color: subCat.id === selectedSubCat?.id ? "#FFFFFF" : "#6B7280",
                  }}
                  transition={{ duration: 0.2 }}
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  {subCat.name}
                </motion.button>
              ))
            ) : (
              <div className="text-gray-400" style={{ fontSize: 13, fontWeight: 600 }}>
                No subcategories
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Product selector */}
        <div className="px-5 py-4">
          <p
            className="text-gray-500 mb-3"
            style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            SELECT PRODUCT
          </p>

          {error && (
            <div className="mb-3 text-red-500" style={{ fontSize: 12, fontWeight: 600 }}>
              {error}
            </div>
          )}

          {isLoadingProducts ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader className="w-4 h-4 animate-spin" />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Loading products</span>
            </div>
          ) : products.length > 0 ? (
            <div
              className="rounded-2xl bg-white p-3"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                {products.map((p) => {
                  const imgSrc = getProductImageSrc(p);
                  const isSelected = selectedProduct?.id === p.id;
                  const isFavorite = favoriteProductIds.includes(p.id);

                  return (
                    <motion.button
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.99 }}
                      aria-pressed={isSelected}
                      className="text-left rounded-2xl border-2 px-3 py-2 bg-white"
                      animate={{
                        borderColor: isSelected ? "#6366F1" : "#F3F4F6",
                        backgroundColor: isSelected ? "#EEF2FF" : "white",
                      }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {imgSrc ? (
                            <ImageWithFallback
                              src={imgSrc}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xl">{p.emoji || "📦"}</span>
                          )}
                        </div>
                        <p
                          className="text-gray-900"
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            lineHeight: "18px",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {p.name}
                        </p>
                        {isFavorite && <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="#F59E0B" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-gray-400" style={{ fontSize: 13, fontWeight: 600 }}>
              {searchQuery.trim()
                ? "No products found"
                : selectedMainCat && !selectedSubCat
                  ? "Select a subcategory to see products"
                  : "No products to show"}
            </div>
          )}
        </div>

        {/* Product detail card */}
        <div className="px-5 mb-4">
          {selectedProduct ? (
            <motion.div
              key={selectedProduct.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-5"
              style={{ boxShadow: "0 8px 24px rgba(99, 102, 241, 0.3)" }}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 overflow-hidden flex items-center justify-center">
                  {getProductImageSrc(selectedProduct) ? (
                    <ImageWithFallback
                      src={getProductImageSrc(selectedProduct)}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-3xl">{selectedProduct.emoji || "📦"}</div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-indigo-200" style={{ fontSize: 12 }}>
                    {selectedSubCat?.name || selectedMainCat?.name || "All products"}
                  </p>
                  <p className="text-white" style={{ fontSize: 16, fontWeight: 700 }}>
                    {selectedProduct.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleToggleFavorite(selectedProduct)}
                  disabled={favoritePendingId === selectedProduct.id}
                  className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center disabled:opacity-50"
                  aria-label={selectedProductFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  title={selectedProductFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                >
                  {favoritePendingId === selectedProduct.id ? (
                    <Loader className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Star
                      className="w-5 h-5"
                      style={{ color: selectedProductFavorite ? "#FCD34D" : "#E0E7FF" }}
                      fill={selectedProductFavorite ? "#FCD34D" : "transparent"}
                    />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div>
                  <p className="text-indigo-200" style={{ fontSize: 11 }}>
                    Best price
                  </p>
                  <p className="text-white" style={{ fontSize: 26, fontWeight: 800 }}>
                    {sortedStores[0] ? `€${sortedStores[0].price.toFixed(2)}` : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-indigo-200" style={{ fontSize: 11 }}>
                    Max savings
                  </p>
                  <div className="flex items-center gap-1 justify-end">
                    <Tag className="w-4 h-4 text-green-300" />
                    <p className="text-green-300" style={{ fontSize: 18, fontWeight: 700 }}>
                      {sortedStores.length >= 2 ? `€${savings.toFixed(2)} off` : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white rounded-3xl p-5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
              <p className="text-gray-700" style={{ fontSize: 14, fontWeight: 700 }}>
                No product selected
              </p>
              <p className="text-gray-400 mt-1" style={{ fontSize: 12 }}>
                Pick a product to compare prices.
              </p>
            </div>
          )}
        </div>

        {/* Sort + Map toggle */}
        <div className="px-5 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-gray-700" style={{ fontSize: 14, fontWeight: 700 }}>
              Stores ({sortedStores.length})
            </p>
            {isLoadingStores && <Loader className="w-4 h-4 text-gray-400 animate-spin" />}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy(sortBy === "price" ? "distance" : "price")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-xl"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-600" style={{ fontSize: 12, fontWeight: 600 }}>
                {sortBy === "price" ? "Price" : "Distance"}
              </span>
            </button>
            <button
              onClick={() => setMapView(!mapView)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ backgroundColor: mapView ? "#6366F1" : "#F3F4F6" }}
            >
              <MapPin className="w-3.5 h-3.5" style={{ color: mapView ? "white" : "#6B7280" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: mapView ? "white" : "#6B7280" }}>Map</span>
            </button>
          </div>
        </div>

        {/* Map view */}
        <AnimatePresence>
          {mapView && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 160, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mx-5 mb-4 rounded-2xl overflow-hidden"
            >
              <div
                className="w-full h-full relative"
                style={{
                  background: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 50%, #C7D2FE 100%)",
                }}
              >
                {/* Fake map grid */}
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                />
                {/* Store pins */}
                {sortedStores.map((store, i) => (
                  <div
                    key={store.id}
                    className="absolute"
                    style={{
                      left: `${20 + i * 22}%`,
                      top: `${25 + (i % 2) * 35}%`,
                    }}
                  >
                    <div
                      className="px-2 py-1 rounded-xl shadow-md flex items-center gap-1"
                      style={{ backgroundColor: i === 0 ? "#6366F1" : "white" }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? "white" : "#111827" }}>
                        €{store.price.toFixed(2)}
                      </span>
                      {typeof store.sale === "number" && store.sale > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            textDecoration: "line-through",
                            color: i === 0 ? "#E0E7FF" : "#6B7280",
                          }}
                        >
                          €{store.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="w-1 h-2 bg-gray-400 mx-auto" />
                  </div>
                ))}
                {/* User location */}
                <div className="absolute bottom-5 right-5">
                  <div className="w-8 h-8 rounded-full bg-blue-500 border-3 border-white shadow-md flex items-center justify-center">
                    <Navigation className="w-4 h-4 text-white" fill="white" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Store list */}
        <div className="px-5 pb-6 flex flex-col gap-3">
          {sortedStores.length === 0 && (
            <div className="text-gray-400" style={{ fontSize: 13, fontWeight: 600 }}>
              {selectedProduct ? "No prices found for this product" : "Select a product to see prices"}
            </div>
          )}
          <AnimatePresence>
            {sortedStores.map((store, i) => (
              <motion.div
                key={`${selectedProduct?.id ?? "none"}-${store.id}`}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-white rounded-2xl p-4"
                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {/* Rank badge */}
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: i === 0 ? "#6366F1" : "#F3F4F6",
                        color: i === 0 ? "white" : "#6B7280",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      #{i + 1}
                    </div>
                    <div>
                      <p className="text-gray-900" style={{ fontSize: 14, fontWeight: 700 }}>
                        {store.name}
                      </p>
                      {(store.dist || typeof store.rating === "number") && (
                        <div className="flex items-center gap-1.5">
                          {store.dist && (
                            <>
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-400" style={{ fontSize: 12 }}>
                                {store.dist}
                              </span>
                            </>
                          )}
                          {typeof store.rating === "number" && (
                            <span className="text-yellow-400" style={{ fontSize: 11 }}>
                              ★ {store.rating}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p style={{ fontSize: 20, fontWeight: 800, color: i === 0 ? "#10B981" : "#111827" }}>
                      €{store.price.toFixed(2)}
                    </p>
                    {typeof store.sale === "number" && store.sale > 0 && (
                      <p className="text-gray-400" style={{ fontSize: 12, textDecoration: "line-through" }}>
                        €{store.originalPrice.toFixed(2)}
                      </p>
                    )}
                    {i > 0 && sortedStores[0] && (
                      <p className="text-red-400" style={{ fontSize: 11 }}>
                        +€{(store.price - sortedStores[0].price).toFixed(2)} more
                      </p>
                    )}
                  </div>
                </div>

                {store.promo && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ backgroundColor: "#ECFDF5" }}>
                    <Tag className="w-3 h-3 text-green-600" />
                    <span className="text-green-700" style={{ fontSize: 11, fontWeight: 600 }}>
                      {store.promo}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
