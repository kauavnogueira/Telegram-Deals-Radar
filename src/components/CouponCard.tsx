'use client';

import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Ticket, Clock, Trash2, Tag } from 'lucide-react';
import { Coupon } from '@/lib/types';

interface CouponCardProps {
  coupon: Coupon;
  onDelete: (id: string) => void;
}


export const CouponCard: React.FC<CouponCardProps> = ({ coupon, onDelete }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(coupon.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(coupon.url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h atrás`;
    return `${Math.floor(diff / 86400)} d atrás`;
  };

  const getStoreBadgeColor = (store: string) => {
    switch (store.toLowerCase()) {
      case 'mercado livre':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'shopee':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      case 'amazon':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      case 'kabum!':
      case 'kabum':
        return 'bg-orange-600/15 text-orange-300 border-orange-500/30';
      case 'magalu':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'aliexpress':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      default:
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    }
  };

  return (
    <div className="group relative flex flex-col h-full bg-[#101524]/85 hover:bg-[#12192a] border border-white/[0.08] hover:border-indigo-500/40 rounded-xl p-4 transition-all duration-200 ease-out shadow-sm hover:shadow-[0_12px_28px_-10px_rgba(0,0,0,0.6)] hover:-translate-y-1">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border shadow-xs ${getStoreBadgeColor(coupon.store)}`}>
            {coupon.store}
          </span>
          <span className="text-[10px] text-slate-400 font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.05]">
            {coupon.channelName}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {formatTime(coupon.createdAt)}
          </span>

          <button
            onClick={() => onDelete(coupon.id)}
            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
            title="Excluir cupom"
            aria-label="Excluir cupom"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="mb-3.5 space-y-1">
        <div className="flex items-baseline gap-2">
          {coupon.discountDescription ? (
            <span className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
              {coupon.discountDescription}
            </span>
          ) : (
            <span className="text-lg font-bold text-indigo-300 flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-indigo-400" />
              Cupom de Desconto
            </span>
          )}
        </div>

        <p className="text-xs text-slate-300 font-medium line-clamp-2 leading-relaxed">
          {coupon.title}
        </p>

        {coupon.minSpend && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 font-medium">
            <span>Mínimo de R$ {coupon.minSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
      </div>

      <div className="mt-auto pt-2">
        <div className="relative flex items-center justify-between p-2.5 rounded-lg bg-[#090d16] border border-dashed border-indigo-500/35 group-hover:border-indigo-500/60 transition-colors">
          <div className="flex items-center gap-2 overflow-hidden">
            <Tag className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-mono text-xs sm:text-sm font-bold text-slate-100 tracking-wider truncate selection:bg-indigo-500">
              {coupon.code}
            </span>
          </div>

          <button
            onClick={handleCopyCode}
            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition active:scale-95 ${
              copiedCode
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
            }`}
          >
            {copiedCode ? (
              <>
                <Check className="w-3 h-3" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium bg-[#141b2b] hover:bg-[#182236] text-slate-300 hover:text-slate-100 border border-white/[0.08] transition flex items-center justify-center gap-1.5 active:scale-95"
            title="Copiar link de resgate / loja"
          >
            {copiedLink ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Link Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span>Copiar Link</span>
              </>
            )}
          </button>

          <a
            href={coupon.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/35 transition flex items-center justify-center gap-1.5 active:scale-95 shadow-xs"
          >
            <span>Usar Cupom</span>
            <ExternalLink className="w-3 h-3 text-emerald-400" />
          </a>
        </div>
      </div>
    </div>
  );
};
