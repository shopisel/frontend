import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  Search, Bell, Plus, ChevronRight, TrendingDown, MapPin, Loader2,
  ShoppingBag, Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLists, ListResponse } from "../../../api/useLists";
import { useProducts, Product } from "../../../api/useProducts";
import { useStores, StoreResponse } from "../../../api/useStores";
import { useAccounts } from "../../../api/useAccounts";
import { usePrices, calculateDiscountPercentage } from "../../../api/usePrices";


const alerts = [
  { id: 1, name: "Salmon Fillet", drop: "↓ 22%", from: "$12.99", to: "$10.10", store: "FreshMart" },
  { id: 2, name: "Almond Milk", drop: "↓ 15%", from: "$3.49", to: "$2.99", store: "NatureMart" },
];

interface FavoriteDeal {
  id: string;
  name: string;
  discountPercent: number;
  price: number;
  original: number;
  storeId: string;
  store: string;
  color: string;
  emoji: string;
  imageSrc?: string;
}

interface HomeListItem {
  id: number;
  productId: string;
  storeId: string;
  quantity: number;
  checked: boolean;
  name: string;
  emoji: string;
  imageSrc?: string;
  store: string;
  color: string;
  qty: string;
  unitPrice: number;
  originalUnitPrice?: number;
  discountPercent?: number;
}

interface HomeScreenProps {
  onNavigate: (tab: string) => void;
  user?: {
    name?: string;
    email?: string;
    username?: string;
  } | null;
  favoriteProductIds?: string[];
}

const getProductImageSrc = (product: Product) => {
  const imageValue = product.image?.trim();
  if (!imageValue) return undefined;
  if (/^(https?:|data:|blob:|\/)/i.test(imageValue)) return imageValue;
  return undefined;
};

const LoadingBall = ({ size = 16 }: { size?: number }) => (
  <span
    className="inline-block rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin"
    style={{ width: size, height: size }}
  />
);

export function HomeScreen({ onNavigate, user, favoriteProductIds = [] }: HomeScreenProps) {
  const navigate = useNavigate();
  const { getLists, updateList } = useLists();
  const { getProductsByIds, getRelatedProductsByFavoriteIds } = useProducts();
  const { getStores } = useStores();
  const { getMyFavoriteProductIds } = useAccounts();
  const { getPrices } = usePrices();

  const [quickAdd, setQuickAdd] = useState("");
  
  const [latestList, setLatestList] = useState<ListResponse | null>(null);
  const [totalListItems, setTotalListItems] = useState(0);
  const [myListItems, setMyListItems] = useState<HomeListItem[]>([]);
  const [favoriteDeals, setFavoriteDeals] = useState<FavoriteDeal[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoadingLatestList, setIsLoadingLatestList] = useState(false);
  const [isLoadingFavoriteDeals, setIsLoadingFavoriteDeals] = useState(false);
  const [isLoadingRelatedProducts, setIsLoadingRelatedProducts] = useState(false);
  const [togglePendingId, setTogglePendingId] = useState<number | null>(null);
  const [addPendingProductId, setAddPendingProductId] = useState<string | null>(null);

  const isBusy =
    isLoadingLatestList ||
    isLoadingFavoriteDeals ||
    togglePendingId !== null ||
    addPendingProductId !== null;

  const refreshLatestList = useCallback(async () => {
    setIsLoadingLatestList(true);
    try {
      const lists = await getLists();
      if (lists && lists.length > 0) {
        const totalItems = lists.reduce(
          (sum, list) => sum + list.items.reduce((listSum, item) => listSum + item.quantity, 0),
          0
        );
        setTotalListItems(totalItems);

        const sortedLists = [...lists].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const latest = sortedLists[0];
        setLatestList(latest);

        const rawItems = latest.items || [];
        const sortedItems = [...rawItems].sort((a, b) => (a.checked === b.checked ? 0 : a.checked ? 1 : -1));
        const top3 = sortedItems.slice(0, 3);
        
        if (top3.length > 0) {
          const productIds = Array.from(new Set(top3.map(i => i.productId)));
          const storeIds = Array.from(new Set(top3.map(i => i.storeId)));
          
          let productsMap: Record<string, Product> = {};
          let storesMap: Record<string, StoreResponse> = {};
          
          if (productIds.length > 0) {
             try {
               const prods = await getProductsByIds(productIds);
               prods.forEach(p => productsMap[p.id] = p);
             } catch(e) {}
          }
          if (storeIds.length > 0) {
             try {
               const stores = await getStores({ ids: storeIds.join(',') });
               stores.forEach(s => storesMap[s.id] = s);
             } catch(e) {}
          }

          const colors = ["#ECFDF5", "#EFF6FF", "#FFF7ED"];
          const priceByItemKey = new Map<string, { unitPrice: number; originalUnitPrice?: number; discountPercent?: number }>();
          await Promise.all(
            top3.map(async (item) => {
              const key = `${item.productId}::${item.storeId}`;
              try {
                const prices = await getPrices(item.productId, item.storeId);
                const best = prices.reduce((acc, curr) => {
                  const accCurrent = typeof acc.sale === "number" && acc.sale > 0 ? acc.sale : acc.price;
                  const currCurrent = typeof curr.sale === "number" && curr.sale > 0 ? curr.sale : curr.price;
                  return currCurrent < accCurrent ? curr : acc;
                }, prices[0]);

                if (!best) {
                  priceByItemKey.set(key, { unitPrice: 0 });
                  return;
                }

                const hasSale = typeof best.sale === "number" && best.sale > 0 && best.sale < best.price;
                const unitPrice = hasSale ? best.sale as number : best.price;
                const originalUnitPrice = hasSale ? best.price : undefined;
                const discountPercent = hasSale ? calculateDiscountPercentage(best.price, best.sale as number) : undefined;
                priceByItemKey.set(key, { unitPrice, originalUnitPrice, discountPercent });
              } catch {
                priceByItemKey.set(key, { unitPrice: 0 });
              }
            })
          );

          const enriched: HomeListItem[] = top3.map((item, idx) => {
            const product = productsMap[item.productId];
            const store = storesMap[item.storeId];
            const pricing = priceByItemKey.get(`${item.productId}::${item.storeId}`);
            return {
              ...item,
              name: product?.name || "Unknown Product",
              emoji: (product as any)?.emoji || "📦",
              imageSrc: product ? getProductImageSrc(product) : undefined,
              store: store?.name || "Unknown Store",
              color: colors[idx % colors.length],
              qty: `${item.quantity}x`,
              unitPrice: pricing?.unitPrice ?? 0,
              originalUnitPrice: pricing?.originalUnitPrice,
              discountPercent: pricing?.discountPercent,
            };
          });
          setMyListItems(enriched);
        } else {
          setMyListItems([]);
        }
      } else {
        setLatestList(null);
        setTotalListItems(0);
        setMyListItems([]);
      }
    } catch (error) {
      console.error(error);
      setLatestList(null);
      setTotalListItems(0);
      setMyListItems([]);
    } finally {
      setIsLoadingLatestList(false);
    }
  }, [getLists, getPrices, getProductsByIds, getStores]);

  useEffect(() => {
    async function fetchLatestList() {
      try {
        await refreshLatestList();
      } catch (error) {
        console.error(error);
      }
    }
    fetchLatestList();
  }, [refreshLatestList]);

  useEffect(() => {
    async function fetchFavoriteDeals() {
      setIsLoadingFavoriteDeals(true);
      try {
        const favoriteIds = await getMyFavoriteProductIds();
        if (!favoriteIds.length) {
          setFavoriteDeals([]);
          return;
        }

        const products = await getProductsByIds(favoriteIds);
        const productsById = new Map(products.map((product) => [product.id, product] as const));

        const discountedResults = await Promise.all(
          favoriteIds.map(async (productId) => {
            try {
              const productPrices = await getPrices(productId);
              const discountedPrices = productPrices.filter(
                (price) =>
                  typeof price.sale === "number" &&
                  price.sale > 0 &&
                  price.sale < price.price
              );

              if (!discountedPrices.length) return null;

              const bestDiscount = discountedPrices.reduce((best, current) => {
                const bestPercent = calculateDiscountPercentage(best.price, best.sale as number);
                const currentPercent = calculateDiscountPercentage(current.price, current.sale as number);
                return currentPercent > bestPercent ? current : best;
              });

              return {
                productId,
                price: bestDiscount.price,
                sale: bestDiscount.sale as number,
                storeId: bestDiscount.storeId,
              };
            } catch {
              return null;
            }
          })
        );

        const validDiscounts = discountedResults.filter(
          (result): result is { productId: string; price: number; sale: number; storeId: string } => Boolean(result)
        );

        if (!validDiscounts.length) {
          setFavoriteDeals([]);
          return;
        }

        const storeIds = Array.from(new Set(validDiscounts.map((deal) => deal.storeId)));
        const stores = storeIds.length ? await getStores({ ids: storeIds.join(",") }) : [];
        const storesById = new Map(stores.map((store) => [store.id, store.name] as const));

        const colors = ["#EEF2FF", "#ECFDF5", "#FFF7ED", "#FDF2F8", "#EFF6FF"];

        const mappedDeals: FavoriteDeal[] = validDiscounts
          .flatMap((deal, index) => {
            const product = productsById.get(deal.productId);
            if (!product) return [];

            return [{
              id: product.id,
              name: product.name,
              discountPercent: calculateDiscountPercentage(deal.price, deal.sale),
              price: deal.sale,
              original: deal.price,
              storeId: deal.storeId,
              store: storesById.get(deal.storeId) || "Unknown Store",
              color: colors[index % colors.length],
              emoji: (product as any)?.emoji || "📦",
              imageSrc: getProductImageSrc(product),
            }];
          })
          .sort((a, b) => b.discountPercent - a.discountPercent);

        setFavoriteDeals(mappedDeals);
      } catch (error) {
        console.error(error);
        setFavoriteDeals([]);
      } finally {
        setIsLoadingFavoriteDeals(false);
      }
    }

    fetchFavoriteDeals();
  }, [getMyFavoriteProductIds, getProductsByIds, getPrices, getStores]);

  useEffect(() => {
    async function fetchRelatedProducts() {
      if (!favoriteProductIds.length) {
        setRelatedProducts([]);
        return;
      }

      setIsLoadingRelatedProducts(true);
      try {
        const related = await getRelatedProductsByFavoriteIds(favoriteProductIds, 3);
        setRelatedProducts(related);
      } catch (error) {
        console.error(error);
        setRelatedProducts([]);
      } finally {
        setIsLoadingRelatedProducts(false);
      }
    }

    fetchRelatedProducts();
  }, [favoriteProductIds, getRelatedProductsByFavoriteIds]);

  const handleToggleItem = async (id: number) => {
    if (!latestList) return;
    setTogglePendingId(id);
    
    setMyListItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
    
    const updatedItems = latestList.items.map(i => i.id === id ? { ...i, checked: !i.checked } : i);
    setLatestList(prev => prev ? { ...prev, items: updatedItems } : null);
    
    try {
      const mappedRequest = updatedItems.map(i => ({
        productId: i.productId,
        storeId: i.storeId,
        quantity: i.quantity,
        checked: i.checked
      }));
      await updateList(latestList.id, undefined, mappedRequest);
    } catch(e) {
      console.error(e);
    } finally {
      setTogglePendingId(null);
    }
  };

  const handleAddDealToList = async (deal: FavoriteDeal) => {
    if (!latestList) return;

    setAddPendingProductId(deal.id);

    try {
      const existingItem = latestList.items.find(
        (item) => item.productId === deal.id && item.storeId === deal.storeId
      );

      const updatedItems = existingItem
        ? latestList.items.map((item) =>
            item.id === existingItem.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [
            ...latestList.items,
            {
              id: Date.now(),
              productId: deal.id,
              storeId: deal.storeId,
              quantity: 1,
              checked: false,
            },
          ];

      await updateList(
        latestList.id,
        undefined,
        updatedItems.map((item) => ({
          productId: item.productId,
          storeId: item.storeId,
          quantity: item.quantity,
          checked: item.checked,
        }))
      );

      await refreshLatestList();
    } catch (error) {
      console.error(error);
    } finally {
      setAddPendingProductId(null);
    }
  };

  const summaryStats = [
    { label: "Items", value: String(totalListItems), icon: ShoppingBag, color: "#6366F1", bg: "#EEF2FF" },
    { label: "Saved", value: "€0", icon: TrendingDown, color: "#10B981", bg: "#ECFDF5" },
    { label: "Alerts", value: "0", icon: Zap, color: "#F59E0B", bg: "#FFFBEB" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F8F9FC] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-6 pb-5 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-400" style={{ fontSize: 13 }}>Good morning 👋</p>
            <h1 className="text-gray-900" style={{ fontSize: 22, fontWeight: 700 }}>
              {user?.name ? `Welcome back, ${user.name}!` : "Welcome to ShopSmart!"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="relative w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center"
              onClick={() => onNavigate("alerts")}
            >
              <Bell className="w-5 h-5 text-indigo-600" />
            </button>
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
              <button
              className="relative w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center"
              onClick={() => onNavigate("profile")}
            >
              <span className="text-white" style={{ fontSize: 14, fontWeight: 700 }}>
                {user?.name?.trim()?.charAt(0).toUpperCase() || "U"}
              </span>
            </button>
            </div>
          </div>
        </div>

        {/* Quick add */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              value={quickAdd}
              onChange={(e) => setQuickAdd(e.target.value)}
              placeholder="Quick add to list..."
              className="flex-1 bg-transparent outline-none text-gray-700"
              style={{ fontSize: 14 }}
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => onNavigate("lists")}
            className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg"
          >
            <Plus className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {isBusy && (
          <div className="px-5 pt-3 flex items-center gap-2 text-indigo-600">
            <LoadingBall size={14} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>A carregar...</span>
          </div>
        )}

        {/* Summary stats */}
        <div className="px-5 py-4 flex gap-3">
          {summaryStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex-1 rounded-2xl p-3 flex flex-col gap-1"
                style={{ backgroundColor: stat.bg }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.color + "22" }}>
                  <Icon className="w-4 h-4" style={{ color: stat.color }} strokeWidth={2} />
                </div>
                <span className="text-gray-900" style={{ fontSize: 16, fontWeight: 700 }}>{stat.value}</span>
                <span className="text-gray-500" style={{ fontSize: 11 }}>{stat.label}</span>
              </div>
            );
          })}
        </div>

        {/* Shopping list preview */}
        <div className="px-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-900" style={{ fontSize: 16, fontWeight: 700 }}>
              {latestList ? latestList.name : "My List"}
            </h3>
            <button
              onClick={() => {
                if (latestList) navigate(`/lists/${latestList.id}`);
                else onNavigate("lists");
              }}
              className="flex items-center gap-1"
              style={{ fontSize: 13, color: "#6366F1", fontWeight: 600 }}
            >
              See all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
            {isLoadingLatestList ? (
              <div className="px-4 py-8 flex items-center justify-center">
                <LoadingBall size={20} />
              </div>
            ) : myListItems.length > 0 ? (
              myListItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3.5"
                  style={{ borderBottom: idx < myListItems.length - 1 ? "1px solid #F3F4F6" : "none" }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg overflow-hidden"
                    style={{ backgroundColor: item.imageSrc ? "transparent" : item.color }}
                  >
                    {item.imageSrc ? (
                      <img
                        src={item.imageSrc}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      item.emoji
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-gray-900"
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        textDecoration: item.checked ? "line-through" : "none",
                        color: item.checked ? "#9CA3AF" : "#111827",
                      }}
                    >
                      {item.name}
                    </p>
                    <p className="text-gray-400" style={{ fontSize: 12 }}>
                      {item.qty} · {item.store}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end leading-tight">
                      <span style={{ fontSize: 14, fontWeight: 700, color: item.checked ? "#9CA3AF" : "#10B981" }}>
                        €{(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                      {typeof item.originalUnitPrice === "number" && item.originalUnitPrice > item.unitPrice && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400" style={{ fontSize: 11, textDecoration: "line-through" }}>
                            €{(item.originalUnitPrice * item.quantity).toFixed(2)}
                          </span>
                          {typeof item.discountPercent === "number" && (
                            <span className="text-green-600" style={{ fontSize: 10, fontWeight: 700 }}>
                              -{item.discountPercent}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleItem(item.id)}
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        borderColor: item.checked ? "#10B981" : "#D1D5DB",
                        backgroundColor: item.checked ? "#10B981" : "transparent",
                      }}
                    >
                      {item.checked && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500" style={{ fontSize: 14 }}>
                A sua lista está vazia.
              </div>
            )}
          </div>
        </div>

        {/* Favorite products on sale */}
        <div className="mb-4">
          <div className="px-5 flex items-center justify-between mb-3">
            <h3 className="text-gray-900" style={{ fontSize: 16, fontWeight: 700 }}>Favoritos em desconto</h3>
            <button
              onClick={() => navigate("/profile/favorites")}
              className="flex items-center gap-1"
              style={{ fontSize: 13, color: "#6366F1", fontWeight: 600 }}
            >
              See all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3 px-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {isLoadingFavoriteDeals && (
              <div className="w-full rounded-3xl bg-white px-4 py-6 flex items-center justify-center">
                <LoadingBall size={20} />
              </div>
            )}
            {favoriteDeals.map((deal) => (
              <motion.div
                key={deal.id}
                className="rounded-3xl p-4 flex-shrink-0 w-44 relative overflow-hidden cursor-pointer"
                style={{ backgroundColor: deal.color, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
                whileTap={{ scale: 0.96 }}
                whileHover={{ y: -2 }}
                onClick={() => navigate("/profile/favorites")}
              >
                <div className="w-14 h-14 rounded-2xl bg-white/80 mb-2 overflow-hidden flex items-center justify-center">
                  {deal.imageSrc ? (
                    <img
                      src={deal.imageSrc}
                      alt={deal.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-3xl">{deal.emoji}</span>
                  )}
                </div>
                <p className="text-gray-800" style={{ fontSize: 13, fontWeight: 700 }}>{deal.name}</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#10B981" }}>€{deal.price.toFixed(2)}</span>
                  <span className="line-through" style={{ fontSize: 11, color: "#9CA3AF" }}>€{deal.original.toFixed(2)}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleAddDealToList(deal);
                  }}
                  disabled={!latestList || addPendingProductId === deal.id}
                  className="mt-2 w-full rounded-xl py-1.5 flex items-center justify-center gap-1.5 transition-all"
                  style={{
                    backgroundColor: !latestList ? "#E5E7EB" : "#6366F1",
                    color: "white",
                    fontSize: 11,
                    fontWeight: 700,
                    opacity: addPendingProductId === deal.id ? 0.8 : 1,
                  }}
                >
                  {addPendingProductId === deal.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      A adicionar...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar a lista
                    </>
                  )}
                </button>
                <div className="flex items-center gap-1 mt-2">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-400" style={{ fontSize: 11 }}>{deal.store}</span>
                </div>
                <div
                  className="absolute top-3 right-3 px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#10B981", fontSize: 10, fontWeight: 700, color: "white" }}
                >
                  -{deal.discountPercent}%
                </div>
              </motion.div>
            ))}
            {!isLoadingFavoriteDeals && !favoriteDeals.length && (
              <div className="w-full rounded-3xl bg-white px-4 py-6 text-center text-gray-500" style={{ fontSize: 14 }}>
                Sem favoritos com desconto de momento.
              </div>
            )}
          </div>
        </div>

        {/* Related to favorites */}
        <div className="mb-4">
          <div className="px-5 flex items-center justify-between mb-3">
            <h3 className="text-gray-900" style={{ fontSize: 16, fontWeight: 700 }}>Relacionados com os favoritos</h3>
            <button
              onClick={() => onNavigate("prices")}
              className="flex items-center gap-1"
              style={{ fontSize: 13, color: "#6366F1", fontWeight: 600 }}
            >
              See all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3 px-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {isLoadingRelatedProducts && (
              <div className="w-full rounded-3xl bg-white px-4 py-6 flex items-center justify-center">
                <LoadingBall size={20} />
              </div>
            )}
            {!isLoadingRelatedProducts && relatedProducts.map((product) => (
              <motion.div
                key={product.id}
                className="rounded-3xl p-4 flex-shrink-0 w-44 relative overflow-hidden"
                style={{ backgroundColor: "#EEF2FF", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
                whileTap={{ scale: 0.96 }}
                whileHover={{ y: -2 }}
              >
                <div className="w-14 h-14 rounded-2xl bg-white/80 mb-2 overflow-hidden flex items-center justify-center">
                  {getProductImageSrc(product) ? (
                    <img
                      src={getProductImageSrc(product)}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-3xl">{(product as any).emoji || "📦"}</span>
                  )}
                </div>
                <p
                  className="text-gray-800"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    minHeight: 38,
                  }}
                >
                  {product.name}
                </p>
              </motion.div>
            ))}
            {!isLoadingRelatedProducts && !relatedProducts.length && (
              <div className="w-full rounded-3xl bg-white px-4 py-6 text-center text-gray-500" style={{ fontSize: 14 }}>
                Sem produtos relacionados para mostrar.
              </div>
            )}
          </div>
        </div>

        {/* Active alerts */}
        <div className="px-5 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-900" style={{ fontSize: 16, fontWeight: 700 }}>Active Alerts</h3>
            <button
              onClick={() => onNavigate("alerts")}
              className="flex items-center gap-1"
              style={{ fontSize: 13, color: "#6366F1", fontWeight: 600 }}
            >
              See all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            <div
              className="bg-white rounded-2xl px-4 py-6 text-center text-gray-500"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)", fontSize: 14 }}
            >
              No active alerts.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

