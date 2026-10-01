'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import useInfiniteScroll from 'react-infinite-scroll-hook';
import { DashboardHeader } from '@/components/DashboardHeader';
import { StatsOverview } from '@/components/StatsOverview';
import { ProductSidebar } from '@/components/ProductSidebar';
import { ProductCard } from '@/components/ProductCard';
import { CouponCard } from '@/components/CouponCard';
import { ManualMessageModal } from '@/components/ManualMessageModal';
import { CollectorGuideModal } from '@/components/CollectorGuideModal';
import { ChannelManagerModal } from '@/components/ChannelManagerModal';
import { Product, Coupon, SortOption, ProductStats } from '@/lib/types';
import { PackageOpen, X, Ticket, CheckCircle, SlidersHorizontal } from 'lucide-react';
const PAGE_SIZE = 24;

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [totalCoupons, setTotalCoupons] = useState(0);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isFetchingTelegram, setIsFetchingTelegram] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const itemsCountRef = useRef(0);
  const prevTotalRef = useRef(0);
  const [activeTab, setActiveTab] = useState<'products' | 'coupons'>('products');

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isChannelManagerOpen, setIsChannelManagerOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      setRefreshing(true);
      setLoadMoreError(null);

      try {
        const currentLimit = isSilent
          ? Math.max(PAGE_SIZE, itemsCountRef.current)
          : PAGE_SIZE;
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());
        if (selectedChannels.length > 0) params.set('channels', selectedChannels.join(','));
        params.set('limit', String(currentLimit));
        params.set('offset', '0');

        if (activeTab === 'products') {
          params.set('tab', 'products');
          if (minPrice && !isNaN(parseFloat(minPrice))) params.set('minPrice', minPrice);
          if (maxPrice && !isNaN(parseFloat(maxPrice))) params.set('maxPrice', maxPrice);
          params.set('sortBy', sortBy);

          const res = await fetch(`/api/products?${params.toString()}`);
          if (!res.ok) throw new Error('Falha ao carregar ofertas');
          const data = await res.json();
          const newTotal = data.total || 0;

          if (isSilent && prevTotalRef.current > 0 && newTotal > prevTotalRef.current) {
            const diff = newTotal - prevTotalRef.current;
            showNotification(`⚡ ${diff} nova${diff > 1 ? 's' : ''} oferta${diff > 1 ? 's' : ''} em tempo real!`);
          }
          prevTotalRef.current = newTotal;
          setProducts(data.products || []);
          setTotalProducts(newTotal);
        } else {
          const res = await fetch(`/api/coupons?${params.toString()}`);
          if (!res.ok) throw new Error('Falha ao carregar cupons');
          const data = await res.json();
          const newTotal = data.total || 0;

          if (isSilent && prevTotalRef.current > 0 && newTotal > prevTotalRef.current) {
            const diff = newTotal - prevTotalRef.current;
            showNotification(`🎟️ ${diff} novo${diff > 1 ? 's' : ''} cupom${diff > 1 ? 'ns' : ''} adicionado${diff > 1 ? 's' : ''}!`);
          }
          prevTotalRef.current = newTotal;
          setCoupons(data.coupons || []);
          setTotalCoupons(newTotal);
        }

        const statsRes = await fetch('/api/stats');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, activeTab, selectedChannels, minPrice, maxPrice, sortBy]
  );

  useEffect(() => {
    itemsCountRef.current = activeTab === 'products' ? products.length : coupons.length;
  }, [activeTab, products.length, coupons.length]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchData(true);
      }
    }, 15000);

    const handleFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchData]);

  const handleLoadMore = useCallback(async () => {
    const currentLength = activeTab === 'products' ? products.length : coupons.length;
    const currentTotal = activeTab === 'products' ? totalProducts : totalCoupons;
    if (loadingMore || currentLength >= currentTotal) return;
    setLoadingMore(true);
    setLoadMoreError(null);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (selectedChannels.length > 0) params.set('channels', selectedChannels.join(','));
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(currentLength));

      if (activeTab === 'products') {
        params.set('tab', 'products');
        if (minPrice && !isNaN(parseFloat(minPrice))) params.set('minPrice', minPrice);
        if (maxPrice && !isNaN(parseFloat(maxPrice))) params.set('maxPrice', maxPrice);
        params.set('sortBy', sortBy);

        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) throw new Error('Falha ao carregar ofertas');
        const data = await res.json();
        setProducts((prev) => [...prev, ...(data.products || [])]);
      } else {
        const res = await fetch(`/api/coupons?${params.toString()}`);
        if (!res.ok) throw new Error('Falha ao carregar cupons');
        const data = await res.json();
        setCoupons((prev) => [...prev, ...(data.coupons || [])]);
      }
    } catch (err: unknown) {
      console.error('Erro ao carregar mais:', err);
      const message = err instanceof Error ? err.message : 'Falha ao carregar mais itens';
      setLoadMoreError(message);
    } finally {
      setLoadingMore(false);
    }
  }, [
    activeTab,
    products.length,
    coupons.length,
    totalProducts,
    totalCoupons,
    loadingMore,
    search,
    selectedChannels,
    minPrice,
    maxPrice,
    sortBy,
  ]);

  const handleDelete = async (id: string) => {
    try {
      const endpoint = activeTab === 'products' ? `/api/products?id=${id}` : `/api/coupons?id=${id}`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        if (activeTab === 'products') {
          setProducts((prev) => prev.filter((p) => p.id !== id));
          setTotalProducts((prev) => Math.max(0, prev - 1));
        } else {
          setCoupons((prev) => prev.filter((c) => c.id !== id));
          setTotalCoupons((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };
  const handleFetchMoreTelegram = async () => {
    setIsFetchingTelegram(true);
    try {
      const res = await fetch('/api/collector/fetch-more', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: 25,
          channel: selectedChannels.length === 1 ? selectedChannels[0] : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao sincronizar com Telegram');
      }

      showNotification(`✨ ${data.newOffersCount || 0} novas mensagens sincronizadas!`);
      await fetchData(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao sincronizar';
      alert(`Aviso: ${message}`);
    } finally {
      setIsFetchingTelegram(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedChannels([]);
    setMinPrice('');
    setMaxPrice('');
    setSortBy('date_desc');
  };
  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (selectedChannels.length > 0 ? 1 : 0) +
    (activeTab === 'products' && (minPrice !== '' || maxPrice !== '') ? 1 : 0) +
    (sortBy !== 'date_desc' ? 1 : 0);

  const hasAnyFilter = activeFilterCount > 0;

  const currentItemsCount = activeTab === 'products' ? products.length : coupons.length;
  const currentTotal = activeTab === 'products' ? totalProducts : totalCoupons;
  const progressPercent = currentTotal > 0 ? Math.min(100, Math.round((currentItemsCount / currentTotal) * 100)) : 0;
  const hasNextPage = currentItemsCount < currentTotal;

  const [sentryRef, { rootRef }] = useInfiniteScroll({
    loading: loadingMore,
    hasNextPage,
    onLoadMore: handleLoadMore,
    disabled: loading || Boolean(loadMoreError),
    rootMargin: '0px 0px 400px 0px',
  });

  return (
    <div className="h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white relative overflow-hidden">
      <div className="absolute top-0 left-1/4 right-1/4 h-72 bg-indigo-500/[0.04] blur-3xl pointer-events-none rounded-full" />

      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#101524]/95 text-slate-100 border border-white/[0.12] px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      <DashboardHeader
        onRefresh={() => fetchData(true)}
        onOpenManualModal={() => setIsManualModalOpen(true)}
        onOpenTerminalGuide={() => setIsGuideModalOpen(true)}
        onOpenChannelManager={() => setIsChannelManagerOpen(true)}
        onOpenMobileFilters={() => setIsMobileFiltersOpen(true)}
        activeFilterCount={activeFilterCount}
        isRefreshing={refreshing}
        totalProducts={currentTotal}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        productsCount={stats?.productsCount}
        couponsCount={stats?.withCouponCount}
      />

      <div className="flex flex-1 w-full overflow-hidden relative z-10">
        <ProductSidebar
          activeTab={activeTab}
          search={search}
          setSearch={setSearch}
          sortBy={sortBy}
          setSortBy={setSortBy}
          selectedChannels={selectedChannels}
          setSelectedChannels={setSelectedChannels}
          minPrice={minPrice}
          setMinPrice={setMinPrice}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          maxAvailablePrice={stats?.maxPrice}
          channels={stats?.channels || []}
          onClearFilters={handleClearFilters}
          onFetchMoreTelegram={handleFetchMoreTelegram}
          isFetchingTelegram={isFetchingTelegram}
          onOpenChannelManager={() => setIsChannelManagerOpen(true)}
          isOpenMobile={isMobileFiltersOpen}
          onCloseMobile={() => setIsMobileFiltersOpen(false)}
        />
        <main ref={rootRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
          <StatsOverview stats={stats} activeTab={activeTab} />

          <div className="bg-[#0e1422]/60 border border-white/[0.07] rounded-xl px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-xs backdrop-blur-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsMobileFiltersOpen(true)}
                className="md:hidden inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 active:scale-95 transition"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                <span>Filtros</span>
                {activeFilterCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/30 text-indigo-200">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <span className="text-xs font-medium text-slate-200">
                {activeTab === 'products' ? 'Ofertas de Produtos' : 'Cupons Promocionais'}
              </span>
              {hasAnyFilter && (
                <>
                  <div className="h-3.5 w-px bg-white/[0.08] mx-0.5" />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {search && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
                        Busca: &ldquo;{search}&rdquo;
                        <button
                          onClick={() => setSearch('')}
                          className="hover:text-white transition"
                          aria-label="Remover busca"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}

                    {selectedChannels.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
                        {selectedChannels.length} {selectedChannels.length === 1 ? 'canal' : 'canais'}
                        <button
                          onClick={() => setSelectedChannels([])}
                          className="hover:text-white transition"
                          aria-label="Remover filtro de canais"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}

                    {(minPrice || maxPrice) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
                        R$ {minPrice || '0'} - {maxPrice || 'Max'}
                        <button
                          onClick={() => {
                            setMinPrice('');
                            setMaxPrice('');
                          }}
                          className="hover:text-white transition"
                          aria-label="Remover filtro de preço"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}

                    <button
                      onClick={handleClearFilters}
                      className="text-[11px] text-slate-400 hover:text-slate-200 underline underline-offset-2 ml-1 transition"
                    >
                      Limpar filtros
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <span>Exibindo</span>
              <span className="text-slate-100 font-semibold">{currentItemsCount}</span>
              <span>de</span>
              <span className="text-slate-300">{currentTotal.toLocaleString('pt-BR')}</span>
              <span className="text-slate-400 font-sans">{activeTab === 'products' ? 'ofertas' : 'cupons'}</span>
            </div>
          </div>

          {loading ? (
            <div className="py-28 flex flex-col items-center justify-center text-slate-400 gap-2.5">
              <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-medium">
                {activeTab === 'products' ? 'Carregando ofertas de produtos...' : 'Carregando cupons ativos...'}
              </p>
            </div>
          ) : currentItemsCount > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 items-stretch">
                {activeTab === 'products'
                  ? products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onDelete={handleDelete}
                      />
                    ))
                  : coupons.map((coupon) => (
                      <CouponCard
                        key={coupon.id}
                        coupon={coupon}
                        onDelete={handleDelete}
                      />
                    ))}
              </div>

              {(hasNextPage || loadingMore) && (
                <div
                  ref={sentryRef}
                  className="pt-6 pb-8 flex flex-col items-center gap-3"
                >
                  <div className="w-48 sm:w-64 h-1 bg-[#151c2d] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {loadMoreError ? (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-xs text-rose-400">{loadMoreError}</p>
                      <button
                        onClick={handleLoadMore}
                        className="px-4 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-medium text-xs border border-indigo-500/30 transition flex items-center gap-1.5 active:scale-95"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 py-1 text-xs text-slate-400 font-medium">
                      <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                      <span>
                        {loadingMore
                          ? activeTab === 'products'
                            ? 'Carregando mais ofertas...'
                            : 'Carregando mais cupons...'
                          : 'Carregando automaticamente...'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {!hasNextPage && currentItemsCount > 0 && (
                <div className="pt-6 pb-8 flex flex-col items-center gap-2 text-center select-none">
                  <div className="w-12 h-0.5 bg-white/[0.06] rounded-full mb-1" />
                  <p className="text-xs text-slate-500 font-medium">
                    Todas as {currentTotal.toLocaleString('pt-BR')} {activeTab === 'products' ? 'ofertas' : 'cupons'} foram carregadas
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center rounded-xl border border-dashed border-white/[0.08] p-8 flex flex-col items-center justify-center bg-[#0e1422]/30">
              <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-400 mb-3">
                {activeTab === 'products' ? (
                  <PackageOpen className="w-6 h-6 stroke-[1.5]" />
                ) : (
                  <Ticket className="w-6 h-6 stroke-[1.5] text-indigo-400" />
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">
                {activeTab === 'products'
                  ? 'Nenhuma oferta de produto encontrada'
                  : 'Nenhum cupom de desconto encontrado'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                {activeTab === 'products'
                  ? 'Nenhum produto corresponde aos critérios aplicados. Tente ajustar os filtros ou a busca.'
                  : 'Nenhum voucher ativo encontrado para os filtros selecionados. Novos cupons postados nos canais monitorados aparecerão aqui automaticamente.'}
              </p>
              {hasAnyFilter && (
                <button
                  onClick={handleClearFilters}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition active:scale-95"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </main>
      </div>

      <ManualMessageModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={() => fetchData(true)}
      />

      <CollectorGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

      <ChannelManagerModal
        isOpen={isChannelManagerOpen}
        onClose={() => setIsChannelManagerOpen(false)}
        onChannelsChanged={() => fetchData(true)}
      />
    </div>
  );
}
