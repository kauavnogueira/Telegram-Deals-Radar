'use client';

import React, { useMemo } from 'react';
import {
  Check,
  RefreshCw,
  SlidersHorizontal,
  X,
  DollarSign,
  Search,
  ArrowUpDown,
  Clock,
  TrendingDown,
  TrendingUp,
  Percent,
  Radio,
  Tag,
} from 'lucide-react';
import { SortOption } from '@/lib/types';

interface SidebarProps {
  activeTab?: 'products' | 'coupons';
  search: string;
  setSearch: (s: string) => void;
  sortBy: SortOption;
  setSortBy: (s: SortOption) => void;
  selectedChannels: string[];
  setSelectedChannels: (channels: string[]) => void;
  minPrice: string;
  setMinPrice: (v: string) => void;
  maxPrice: string;
  setMaxPrice: (v: string) => void;
  maxAvailablePrice?: number;
  channels: { channel: string; count: number }[];
  onClearFilters: () => void;
  onFetchMoreTelegram: () => void;
  isFetchingTelegram: boolean;
  onOpenChannelManager?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const ProductSidebar: React.FC<SidebarProps> = ({
  activeTab = 'products',
  search,
  setSearch,
  sortBy,
  setSortBy,
  selectedChannels,
  setSelectedChannels,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  maxAvailablePrice = 10000,
  channels,
  onClearFilters,
  onFetchMoreTelegram,
  isFetchingTelegram,
  onOpenChannelManager,
  isOpenMobile,
  onCloseMobile,
}) => {
  const sliderMax = Math.max(maxAvailablePrice || 10000, 5000);

  const allChannels = useMemo(() => {
    return channels.map((ch) => ({
      channel: ch.channel,
      count: ch.count,
    }));
  }, [channels]);

  const toggleChannel = (channel: string) => {
    if (selectedChannels.includes(channel)) {
      setSelectedChannels(selectedChannels.filter((c) => c !== channel));
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };

  const handleSelectAllChannels = () => {
    if (selectedChannels.length === allChannels.length) {
      setSelectedChannels([]);
    } else {
      setSelectedChannels(allChannels.map((c) => c.channel));
    }
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedChannels.length > 0 ||
    minPrice !== '' ||
    maxPrice !== '' ||
    sortBy !== 'date_desc';

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (selectedChannels.length > 0 ? 1 : 0) +
    (minPrice || maxPrice ? 1 : 0) +
    (sortBy !== 'date_desc' ? 1 : 0);

  const sortOptions: { id: SortOption; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'date_desc', label: 'Mais Recente', icon: Clock },
    { id: 'price_asc', label: 'Menor Preço', icon: TrendingDown },
    { id: 'discount_desc', label: 'Maior Desconto', icon: Percent },
    { id: 'price_desc', label: 'Maior Preço', icon: TrendingUp },
  ];

  const quickPricePresets = [
    { label: 'Até R$ 100', min: '', max: '100' },
    { label: 'Até R$ 500', min: '', max: '500' },
    { label: 'Até R$ 1.500', min: '', max: '1500' },
    { label: 'R$ 2.000+', min: '2000', max: '' },
  ];

  const sidebarContent = (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Filtros
            </span>
            {activeFilterCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {activeFilterCount}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={onClearFilters}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
              >
                <X className="w-3 h-3" />
                <span>Limpar</span>
              </button>
            )}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition md:hidden"
                aria-label="Fechar filtros"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
            <span>Buscar Produto</span>
            <span className="text-[10px] text-slate-400 font-normal lowercase">sem acentos</span>
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'coupons'
                  ? 'Ex: cupom, 10%, amazon, shopee...'
                  : 'Ex: tv, monitor, ryzen, fone...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#101524] border border-white/[0.08] rounded-lg pl-9 pr-7 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                aria-label="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-white/[0.06]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>Ordenar Por</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {sortOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = sortBy === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(opt.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition border ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-200 font-medium shadow-xs'
                      : 'border-white/[0.05] bg-[#101524]/60 hover:bg-[#101524] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isSelected ? 'text-indigo-400' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate text-[11px]">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'coupons' ? (
          <div className="pt-2 border-t border-white/[0.06]">
            <div className="p-2.5 rounded-lg bg-[#101524]/60 border border-white/[0.06] text-[11px] text-slate-400 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Cupons são filtrados por código, loja e canais monitorados.</span>
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t border-white/[0.06]">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              <span>Faixa de Preço</span>
            </div>
            {(minPrice !== '' || maxPrice !== '') && (
              <button
                onClick={() => {
                  setMinPrice('');
                  setMaxPrice('');
                }}
                className="text-[10px] text-slate-400 hover:text-slate-200 transition"
              >
                Resetar
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {quickPricePresets.map((preset) => {
              const isPresetActive = minPrice === preset.min && maxPrice === preset.max;
              return (
                <button
                  key={preset.label}
                  onClick={() => {
                    if (isPresetActive) {
                      setMinPrice('');
                      setMaxPrice('');
                    } else {
                      setMinPrice(preset.min);
                      setMaxPrice(preset.max);
                    }
                  }}
                  className={`px-2 py-1 rounded-md text-[10px] font-medium border text-center transition ${
                    isPresetActive
                      ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                      : 'bg-[#101524]/50 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-[#101524]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-3 mb-3 bg-[#101524]/80 p-3 rounded-lg border border-white/[0.07]">
            <div className="flex justify-between items-center text-[11px] font-mono">
              <span className="text-slate-200 font-semibold">
                R$ {minPrice ? Number(minPrice).toLocaleString('pt-BR') : '0'}
              </span>
              <span className="text-slate-400 text-[10px] font-sans">até</span>
              <span className="text-slate-200 font-semibold">
                R${' '}
                {maxPrice
                  ? Number(maxPrice).toLocaleString('pt-BR')
                  : sliderMax.toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="relative w-full h-5 flex items-center px-1">
              <div className="w-full h-1.5 bg-[#172033] rounded-full relative overflow-hidden">
                <div
                  className="absolute h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-violet-500 rounded-full transition-all duration-75"
                  style={{
                    left: `${Math.min(100, Math.max(0, ((minPrice ? Number(minPrice) : 0) / sliderMax) * 100))}%`,
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        (((maxPrice ? Number(maxPrice) : sliderMax) -
                          (minPrice ? Number(minPrice) : 0)) /
                          sliderMax) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>

              <input
                type="range"
                min="0"
                max={sliderMax}
                step="10"
                value={minPrice ? Number(minPrice) : 0}
                onChange={(e) => {
                  const currentMax = maxPrice ? Number(maxPrice) : sliderMax;
                  const newMin = Math.min(Number(e.target.value), currentMax - 10);
                  setMinPrice(newMin <= 0 ? '' : String(newMin));
                }}
                className="dual-range-input"
                style={{
                  zIndex: (minPrice ? Number(minPrice) : 0) > sliderMax - 100 ? 25 : 21,
                }}
                aria-label="Preço mínimo"
              />

              <input
                type="range"
                min="0"
                max={sliderMax}
                step="10"
                value={maxPrice ? Number(maxPrice) : sliderMax}
                onChange={(e) => {
                  const currentMin = minPrice ? Number(minPrice) : 0;
                  const newMax = Math.max(Number(e.target.value), currentMin + 10);
                  setMaxPrice(newMax >= sliderMax ? '' : String(newMax));
                }}
                className="dual-range-input"
                style={{ zIndex: 22 }}
                aria-label="Preço máximo"
              />
            </div>

            <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono pt-0.5">
              <span>Min: R$ 0</span>
              <span>Max: R$ {sliderMax.toLocaleString('pt-BR')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Mínimo</label>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-[10px] text-slate-400 font-mono">R$</span>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  max={sliderMax}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full bg-[#101524] border border-white/[0.08] rounded-lg pl-7 pr-2 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 font-mono transition"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Máximo</label>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-[10px] text-slate-400 font-mono">R$</span>
                <input
                  type="number"
                  placeholder={String(sliderMax)}
                  min="0"
                  max={sliderMax}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full bg-[#101524] border border-white/[0.08] rounded-lg pl-7 pr-2 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 font-mono transition"
                />
              </div>
            </div>
          </div>
        </div>
        )}

        <div className="pt-2 border-t border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-slate-400" />
              <span>Canais ({allChannels.length})</span>
            </div>
            <div className="flex items-center gap-2">
              {onOpenChannelManager && (
                <button
                  onClick={onOpenChannelManager}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium transition cursor-pointer"
                >
                  + Gerenciar
                </button>
              )}
              <button
                onClick={handleSelectAllChannels}
                className="text-[10px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                {selectedChannels.length === allChannels.length ? 'Desmarcar' : 'Todos'}
              </button>
            </div>
          </div>

          <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
            {allChannels.map((item) => {
              const isChecked = selectedChannels.includes(item.channel);
              return (
                <div
                  key={item.channel}
                  onClick={() => toggleChannel(item.channel)}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition text-xs border ${
                    isChecked
                      ? 'bg-indigo-600/10 border-indigo-500/30 text-slate-100 font-medium'
                      : 'border-transparent bg-[#101524]/40 hover:bg-[#101524] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">

                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors shrink-0 ${
                        isChecked
                          ? 'bg-indigo-600 text-white'
                          : 'border border-white/[0.2] bg-[#0c101a] group-hover:border-white/[0.35]'
                      }`}
                    >
                      {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span className="truncate text-[11px]">{item.channel}</span>
                  </div>

                  {item.count > 0 && (
                    <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1 bg-white/[0.04] px-1.5 py-0.2 rounded border border-white/[0.04]">
                      {item.count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>


      <div className="pt-3 mt-3 border-t border-white/[0.07] space-y-2">
        <div className="flex items-center justify-between px-1 text-[11px]">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Auto-sync ativo
          </span>
          <span className="text-[10px] text-slate-500 font-mono">tempo real</span>
        </div>
        <button
          onClick={onFetchMoreTelegram}
          disabled={isFetchingTelegram}
          className="w-full py-2 px-3 rounded-lg text-xs font-medium bg-[#101524] hover:bg-[#151c2d] text-slate-300 border border-white/[0.08] hover:border-indigo-500/40 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-xs"
          title="Forçar busca do histórico dos últimos 7 dias via API"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${
              isFetchingTelegram ? 'animate-spin text-indigo-400' : 'text-slate-400'
            }`}
          />
          <span>
            {isFetchingTelegram ? 'Sincronizando 7 dias...' : 'Puxar histórico manual'}
          </span>
        </button>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center gap-2 active:scale-95 shadow-md md:hidden"
          >
            Aplicar Filtros
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden md:flex w-72 lg:w-80 shrink-0 bg-[#0c101a] border-r border-white/[0.07] h-full flex-col justify-between overflow-y-auto p-4 sm:p-5 select-none text-slate-300">
        {sidebarContent}
      </aside>

      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-80 max-w-[85vw] bg-[#0c101a] border-r border-white/[0.1] h-full flex flex-col justify-between overflow-y-auto p-4 select-none text-slate-300 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
