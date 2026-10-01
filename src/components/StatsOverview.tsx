'use client';

import React from 'react';
import { Package, DollarSign, Tag, Ticket } from 'lucide-react';
import { ProductStats } from '@/lib/types';

interface StatsProps {
  stats: ProductStats | null;
  activeTab?: 'products' | 'coupons';
}


export const StatsOverview: React.FC<StatsProps> = ({ stats, activeTab = 'products' }) => {
  if (!stats) return null;

  const count =
    activeTab === 'coupons'
      ? (stats.withCouponCount ?? 0)
      : (stats.productsCount ?? stats.total ?? 0);

  const label = activeTab === 'coupons' ? 'Total de Cupons' : 'Total de Produtos';
  const avgPriceFormatted = stats.avgPrice
    ? stats.avgPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0,00';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-[#0e1422]/70 border border-white/[0.08] backdrop-blur-md shadow-sm">
      <div className="flex items-center flex-wrap gap-4 sm:gap-6 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            {activeTab === 'coupons' ? (
              <Tag className="w-3.5 h-3.5" />
            ) : (
              <Package className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5 leading-none">
            <span className="text-sm font-semibold text-slate-100 font-mono tracking-tight">
              {count.toLocaleString('pt-BR')}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {label}
            </span>
          </div>
        </div>

        <div className="hidden sm:block h-4 w-px bg-white/[0.08]" />

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            {activeTab === 'coupons' ? (
              <Ticket className="w-3.5 h-3.5" />
            ) : (
              <DollarSign className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5 leading-none">
            <span className="text-sm font-semibold text-slate-100 font-mono tracking-tight">
              {activeTab === 'coupons' ? `${stats.stores?.length || 0} lojas` : `R$ ${avgPriceFormatted}`}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {activeTab === 'coupons' ? 'Lojas Monitoradas' : 'Preço Médio'}
            </span>
          </div>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-[11px] text-slate-400">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="font-mono text-slate-300">Radar Ativo</span>
        <span className="text-slate-500">•</span>
        <span>Últimos 7 dias</span>
      </div>
    </div>
  );
};
