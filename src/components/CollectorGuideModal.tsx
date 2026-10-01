'use client';

import React from 'react';
import { X, Terminal } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CollectorGuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0e1422] border border-white/[0.1] rounded-2xl w-full max-w-xl p-6 shadow-2xl relative text-slate-300">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-white/[0.05] transition"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Terminal className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold text-slate-100 tracking-tight">
            Guia de Execução do Coletor
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          O coletor agora filtra automaticamente ofertas dos últimos 7 dias e captura fotos dos produtos.
        </p>

        <div className="space-y-3.5 text-xs">
          <div className="p-3.5 rounded-xl bg-[#101625] border border-white/[0.07] space-y-2">
            <div className="font-medium text-slate-200 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center justify-center">
                1
              </span>
              <span>Comando único de inicialização</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              O comando <code className="text-indigo-300 font-mono">npm run dev</code> agora inicia o Next.js e o coletor Telegram em tempo real simultaneamente:
            </p>
            <div className="bg-[#0a0d16] px-3 py-2 rounded-lg font-mono text-indigo-300 border border-white/[0.06] text-xs">
              npm run dev
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#101625] border border-white/[0.07] space-y-2">
            <div className="font-medium text-slate-200 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-mono flex items-center justify-center">
                2
              </span>
              <span>Zero cliques: Sincronização automática</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Sempre que uma promoção é enviada nos seus canais monitorados, ela é salva com foto no banco SQLite e a dashboard atualiza sozinha em background.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#101625] border border-white/[0.07] space-y-2">
            <div className="font-medium text-slate-200 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-mono flex items-center justify-center">
                3
              </span>
              <span>Fallback manual</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              O botão &quot;Puxar histórico manual&quot; na barra lateral pode ser usado se você quiser forçar uma releitura rápida dos últimos 7 dias via API.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition active:scale-95"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
