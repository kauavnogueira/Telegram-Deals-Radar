'use client';

import React from 'react';
import { Send, RefreshCw, Plus, Terminal, Package, Ticket, SlidersHorizontal, Radio } from 'lucide-react';

interface Props {
  onRefresh: () => void;
  onOpenManualModal: () => void;
  onOpenTerminalGuide: () => void;
  onOpenChannelManager: () => void;
  onOpenMobileFilters?: () => void;
  isRefreshing: boolean;
  totalProducts: number;
  activeTab: 'products' | 'coupons';
  setActiveTab: (tab: 'products' | 'coupons') => void;
  productsCount?: number;
  couponsCount?: number;
  activeFilterCount?: number;
}


export const DashboardHeader: React.FC<Props> = ({
  onRefresh,
  onOpenManualModal,
  onOpenTerminalGuide,
  onOpenChannelManager,
  onOpenMobileFilters,
  isRefreshing,
  activeTab,
  setActiveTab,
  productsCount = 0,
  couponsCount = 0,
}) => {
  return (
    <header className="border-b border-white/[0.08] bg-[#0b0f17]/90 backdrop-blur-md px-3 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-30 transition-colors">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xs shadow-indigo-500/10 shrink-0">
          <Send className="w-4 h-4 -rotate-12 translate-x-[-1px] text-indigo-400" />
        </div>
        <div className="hidden xs:block">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-slate-100 tracking-tight">
              Radar de Ofertas
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Auto-Sync Ativo</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center bg-[#101524] p-0.5 sm:p-1 rounded-xl border border-white/[0.08] shadow-inner shrink-0">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'products'
              ? 'bg-[#1a2338] text-slate-100 shadow-sm border border-white/[0.09]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          <Package
            className={`w-3.5 h-3.5 ${
              activeTab === 'products' ? 'text-indigo-400' : 'text-slate-400'
            }`}
          />
          <span>Produtos</span>
          {productsCount > 0 && (
            <span
              className={`hidden sm:inline-block px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold ${
                activeTab === 'products'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-white/[0.05] text-slate-400'
              }`}
            >
              {productsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('coupons')}
          className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'coupons'
              ? 'bg-[#1a2338] text-slate-100 shadow-sm border border-white/[0.09]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          <Ticket
            className={`w-3.5 h-3.5 ${
              activeTab === 'coupons' ? 'text-amber-400' : 'text-slate-400'
            }`}
          />
          <span>Cupons</span>
          {couponsCount > 0 && (
            <span
              className={`hidden sm:inline-block px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold ${
                activeTab === 'coupons'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-white/[0.05] text-slate-400'
              }`}
            >
              {couponsCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">

        <button
          onClick={onOpenChannelManager}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#101524] hover:bg-[#151c2d] text-slate-300 hover:text-slate-100 border border-white/[0.08] hover:border-indigo-500/40 transition shadow-xs"
        >
          <Radio className="w-3.5 h-3.5 text-indigo-400" />
          <span>Gerenciar Canais</span>
        </button>

        <button
          onClick={onOpenTerminalGuide}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#101524] hover:bg-[#151c2d] text-slate-300 hover:text-slate-100 border border-white/[0.08] hover:border-white/[0.14] transition shadow-xs"
        >
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <span>Guia do Coletor</span>
        </button>

        <button
          onClick={onOpenManualModal}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/35 hover:border-indigo-500/50 transition active:scale-95 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Testar Mensagem</span>
        </button>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-lg bg-[#101524] hover:bg-[#151c2d] text-slate-400 hover:text-slate-200 border border-white/[0.08] hover:border-white/[0.14] transition disabled:opacity-50 active:scale-95 shadow-xs"
          title="Recarregar dados"
          aria-label="Recarregar dados"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>
    </header>
  );
};
