'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  RefreshCw,
  Plus,
  Terminal,
  Package,
  Ticket,
  SlidersHorizontal,
  Radio,
  MoreVertical,
} from 'lucide-react';

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
  activeFilterCount = 0,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fechar menu mobile ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  return (
    <header className="border-b border-white/[0.08] bg-[#0b0f17]/95 backdrop-blur-md px-2.5 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-30 transition-colors gap-2">
      {/* Brand / Logo */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xs shadow-indigo-500/10 shrink-0">
          <Send className="w-4 h-4 -rotate-12 translate-x-[-1px] text-indigo-400" />
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xs sm:text-sm font-bold text-slate-100 tracking-tight leading-none whitespace-nowrap">
            <span className="hidden sm:inline">Radar de Ofertas</span>
            <span className="sm:hidden">Radar</span>
          </h1>
          <span className="hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-xs whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Auto-Sync</span>
          </span>
        </div>
      </div>

      {/* Center Tabs: Produtos / Cupons */}
      <div className="flex items-center bg-[#101524] p-0.5 sm:p-1 rounded-xl border border-white/[0.08] shadow-inner shrink-0">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'products'
              ? 'bg-[#1a2338] text-slate-100 shadow-sm border border-white/[0.09]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
          aria-label="Aba de Produtos"
        >
          <Package
            className={`w-3.5 h-3.5 shrink-0 ${
              activeTab === 'products' ? 'text-indigo-400' : 'text-slate-400'
            }`}
          />
          <span className="text-[11px] sm:text-xs">Produtos</span>
          {productsCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold ${
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
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'coupons'
              ? 'bg-[#1a2338] text-slate-100 shadow-sm border border-white/[0.09]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
          aria-label="Aba de Cupons"
        >
          <Ticket
            className={`w-3.5 h-3.5 shrink-0 ${
              activeTab === 'coupons' ? 'text-amber-400' : 'text-slate-400'
            }`}
          />
          <span className="text-[11px] sm:text-xs">Cupons</span>
          {couponsCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold ${
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

      {/* Actions & Menu */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Filtros Mobile Button (Header trigger) */}
        {onOpenMobileFilters && (
          <button
            onClick={onOpenMobileFilters}
            className="md:hidden flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-medium rounded-lg bg-[#101524] hover:bg-[#151c2d] text-indigo-300 border border-indigo-500/30 transition shadow-xs active:scale-95"
            title="Abrir filtros"
            aria-label="Abrir filtros"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/30 text-indigo-200">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}

        {/* Gerenciar Canais (Visível no mobile e expandido em telas maiores) */}
        <button
          onClick={onOpenChannelManager}
          className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] text-xs font-medium rounded-lg bg-[#101524] hover:bg-[#151c2d] text-slate-300 hover:text-slate-100 border border-white/[0.08] hover:border-indigo-500/40 transition shadow-xs whitespace-nowrap active:scale-95"
          title="Gerenciar Canais do Telegram"
          aria-label="Gerenciar Canais do Telegram"
        >
          <Radio className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="hidden min-[480px]:inline md:hidden">Canais</span>
          <span className="hidden md:inline">Gerenciar Canais</span>
        </button>

        {/* Guia do Coletor (Visible on lg+) */}
        <button
          onClick={onOpenTerminalGuide}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#101524] hover:bg-[#151c2d] text-slate-300 hover:text-slate-100 border border-white/[0.08] hover:border-white/[0.14] transition shadow-xs whitespace-nowrap"
        >
          <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Guia do Coletor</span>
        </button>

        {/* Testar Mensagem (Desktop / Tablet) */}
        <button
          onClick={onOpenManualModal}
          className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/35 hover:border-indigo-500/50 transition active:scale-95 shadow-xs whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span>Testar Mensagem</span>
        </button>

        {/* Recarregar dados */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg bg-[#101524] hover:bg-[#151c2d] text-slate-400 hover:text-slate-200 border border-white/[0.08] hover:border-white/[0.14] transition disabled:opacity-50 active:scale-95 shadow-xs shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Recarregar dados"
          aria-label="Recarregar dados"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`}
          />
        </button>

        {/* Mobile / Tablet Menu (Dropdown for hidden items on small screens) */}
        <div className="relative sm:hidden" ref={menuRef}>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`p-2 rounded-lg border transition shadow-xs active:scale-95 min-w-[36px] min-h-[36px] flex items-center justify-center ${
              isMobileMenuOpen
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                : 'bg-[#101524] hover:bg-[#151c2d] text-slate-400 hover:text-slate-200 border-white/[0.08]'
            }`}
            aria-label="Mais opções do menu"
            title="Mais opções"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {isMobileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#0f1424] border border-white/[0.12] shadow-2xl p-1.5 z-50 text-slate-200 text-xs animate-in fade-in zoom-in-95">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/[0.06] mb-1">
                Ações Rápidas
              </div>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenManualModal();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/[0.06] transition text-left text-slate-200 active:bg-white/[0.08]"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Testar Mensagem Bruta</span>
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenChannelManager();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/[0.06] transition text-left text-slate-200 active:bg-white/[0.08]"
              >
                <Radio className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Gerenciar Canais Telegram</span>
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenTerminalGuide();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/[0.06] transition text-left text-slate-200 active:bg-white/[0.08]"
              >
                <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Guia do Coletor</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
