'use client';

import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Tag, Clock, Trash2, Image as ImageIcon } from 'lucide-react';
import { Product } from '@/lib/types';

interface CardProps {
  product: Product;
  onDelete: (id: string) => void;
}


export const ProductCard: React.FC<CardProps> = ({ product, onDelete }) => {
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleCopyCoupon = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.coupon) {
      navigator.clipboard.writeText(product.coupon);
      setCopiedCoupon(true);
      setTimeout(() => setCopiedCoupon(false), 2000);
    }
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(product.url);
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

  return (
    <div className="group relative flex flex-col h-full bg-[#101524]/80 hover:bg-[#12192a] border border-white/[0.08] hover:border-indigo-500/35 rounded-xl p-3.5 transition-all duration-200 ease-out shadow-sm hover:shadow-[0_12px_28px_-10px_rgba(0,0,0,0.6)] hover:-translate-y-1">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#151d2e] text-slate-300 border border-white/[0.08] shadow-xs">
              {product.store}
            </span>


            {product.discountPercent && product.discountPercent > 0 ? (
              <span className="px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                -{product.discountPercent}%
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {formatTime(product.createdAt)}
            </span>

            <button
              onClick={() => onDelete(product.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition"
              title="Remover oferta"
              aria-label="Remover oferta"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="relative w-full aspect-[4/3] mb-3 rounded-lg overflow-hidden bg-white border border-white/[0.12] flex items-center justify-center p-2.5 select-none shadow-inner">

          {product.imageUrl && !imageError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-contain relative z-10 group-hover:scale-105 transition-transform duration-300 ease-out"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 gap-1.5 relative z-10">
              <ImageIcon className="w-7 h-7 stroke-[1.5]" />
              <span className="text-[10px] text-slate-400 font-medium">Foto do Produto</span>
            </div>
          )}
        </div>

        <h3
          className="h-10 text-xs sm:text-[13px] font-medium text-slate-200 group-hover:text-white leading-snug line-clamp-2 mb-1.5 transition-colors"
          title={product.title}
        >
          {product.title}
        </h3>


        <div className="text-[11px] text-slate-400 mb-3 flex items-center gap-1">
          <span>via</span>
          <span className="text-slate-300 font-medium truncate">{product.channelName}</span>
        </div>
      </div>

      <div className="mt-auto flex flex-col justify-end pt-3 border-t border-white/[0.06] space-y-2.5">
        <div className="h-8 w-full flex items-center">
          {product.coupon ? (
            <div className="w-full flex items-center justify-between px-2.5 py-1 rounded-lg bg-amber-500/10 border border-dashed border-amber-500/25">
              <div className="flex items-center gap-1.5 text-xs text-amber-300 font-mono font-medium truncate">
                <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{product.coupon}</span>
              </div>
              <button
                onClick={handleCopyCoupon}
                className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#151c2d] hover:bg-[#1b253b] text-slate-200 border border-white/[0.08] transition flex items-center gap-1 shrink-0 active:scale-95"
                title="Copiar cupom"
              >
                {copiedCoupon ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>

        <div>
          <div className="h-4 flex items-center">
            {product.originalPrice && product.originalPrice > product.price ? (
              <span className="text-[11px] text-slate-400 line-through">
                De R$ {product.originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            ) : null}
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-xs text-indigo-400 font-semibold font-mono">R$</span>
            <span className="text-xl font-bold tracking-tight text-slate-100 font-mono">
              {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          <button
            onClick={handleCopyLink}
            className="px-2.5 py-2 rounded-lg text-xs font-medium bg-[#151c2d] hover:bg-[#1b253b] text-slate-300 hover:text-slate-100 border border-white/[0.08] hover:border-white/[0.14] flex items-center justify-center gap-1.5 transition active:scale-95 shrink-0"
            title="Copiar link da oferta"
            aria-label="Copiar link da oferta"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copiar Link</span>
              </>
            )}
          </button>

          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] border border-indigo-500/50 flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
          >
            <span>Ir para Oferta</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        </div>
      </div>
    </div>
  );
};
