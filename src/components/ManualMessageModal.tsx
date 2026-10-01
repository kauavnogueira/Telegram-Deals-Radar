'use client';

import React, { useState } from 'react';
import { X, Send, AlertCircle, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ManualMessageModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [text, setText] = useState('');
  const [channel, setChannel] = useState('@canal_ofertas');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.SyntheticEvent) => {
    if (!text.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: text, channelName: channel }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar mensagem');
      }

      setText('');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao processar mensagem';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadExample = () => {
    setText(`Monitor Gamer AOC Hero 24" 144Hz IPS 1ms
De R$ 1.199,00 por R$ 699,00 à vista ou 10x de R$ 74,90
Cupom: HERO10
Link: https://www.amazon.com.br/dp/B088HERO`);
    setChannel('@canal_tech');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0e1422] border border-white/[0.1] rounded-2xl w-full max-w-lg p-5 shadow-2xl relative text-slate-300">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-white/[0.05] transition"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-semibold text-slate-100 tracking-tight">Testar Extrator de Oferta</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Cole a mensagem bruta para verificar a extração correta de preço, cupom e loja.
        </p>

        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs text-slate-300 font-medium mb-1">
              Canal de Origem:
            </label>
            <input
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="@nome_do_canal"
              className="w-full bg-[#101625] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition font-mono"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-slate-300 font-medium">
                Texto da Mensagem:
              </label>
              <button
                type="button"
                onClick={loadExample}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline transition"
              >
                Colar exemplo
              </button>
            </div>
            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Cole a mensagem aqui..."
              className="w-full bg-[#101625] border border-white/[0.08] rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 font-mono transition resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-lg bg-[#101625] hover:bg-[#151d2f] text-slate-300 border border-white/[0.08] transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Extraindo...' : 'Extrair & Salvar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
