'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Radio,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { MonitoredChannel, TelegramAccountChannel } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onChannelsChanged?: () => void;
}

export const ChannelManagerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onChannelsChanged,
}) => {
  const [channels, setChannels] = useState<MonitoredChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newChannel, setNewChannel] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncingChannel, setSyncingChannel] = useState<string | null>(null);
  const [telegramChannels, setTelegramChannels] = useState<TelegramAccountChannel[]>([]);
  const [loadingTelegram, setLoadingTelegram] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState(false);
  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/channels');
      if (!res.ok) throw new Error('Falha ao carregar lista de canais');
      const data = (await res.json()) as { channels?: MonitoredChannel[] };
      setChannels(data.channels || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao listar canais';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTelegramChannels = useCallback(async () => {
    setLoadingTelegram(true);
    setTelegramError(null);
    try {
      const res = await fetch('/api/channels/telegram');
      const data = (await res.json()) as { channels?: TelegramAccountChannel[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao carregar canais da conta Telegram');
      }
      setTelegramChannels(data.channels || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao buscar canais do Telegram';
      setTelegramError(msg);
    } finally {
      setLoadingTelegram(false);
    }
  }, []);

  // Canais da conta que ainda NÃO estão sendo ouvidos/monitorados
  const availableChannels = useMemo(() => {
    const monitoredUsernames = new Set(
      channels.flatMap((c) => [
        c.username.toLowerCase(),
        c.username.toLowerCase().replace(/^@/, ''),
      ])
    );

    return telegramChannels.filter((tc) => {
      const idMatch = tc.id ? monitoredUsernames.has(tc.id.toLowerCase()) : false;
      const identifierMatch =
        monitoredUsernames.has(tc.identifier.toLowerCase()) ||
        monitoredUsernames.has(tc.identifier.toLowerCase().replace(/^@/, ''));
      const usernameMatch = tc.username
        ? monitoredUsernames.has(tc.username.toLowerCase()) ||
          monitoredUsernames.has(tc.username.toLowerCase().replace(/^@/, ''))
        : false;

      return !idMatch && !identifierMatch && !usernameMatch;
    });
  }, [telegramChannels, channels]);

  useEffect(() => {
    if (isOpen) {
      fetchChannels();
      fetchTelegramChannels();
      setError(null);
      setSuccess(null);
      setNewChannel('');
      setNewTitle('');
      setManualInput(false);
    }
  }, [isOpen, fetchChannels, fetchTelegramChannels]);

  if (!isOpen) return null;

  const handleAddChannel = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!newChannel.trim()) return;

    setAdding(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: newChannel.trim(),
          title: newTitle.trim() || undefined,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
        channel?: MonitoredChannel;
      };

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao adicionar canal');
      }

      setSuccess(data.message || 'Canal adicionado com sucesso!');
      setNewChannel('');
      setNewTitle('');
      await Promise.all([fetchChannels(), fetchTelegramChannels()]);
      if (onChannelsChanged) onChannelsChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao adicionar canal';
      setError(msg);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveChannel = async (channelUsername: string) => {
    if (!confirm(`Deseja parar de monitorar o canal ${channelUsername}?`)) return;

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/channels?channel=${encodeURIComponent(channelUsername)}`, {
        method: 'DELETE',
      });
      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao remover canal');
      }

      setSuccess(`Canal ${channelUsername} removido.`);
      await fetchChannels();
      if (onChannelsChanged) onChannelsChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover canal';
      setError(msg);
    }
  };

  const handleToggleChannel = async (channelUsername: string, currentStatus: boolean) => {
    setError(null);
    try {
      const res = await fetch('/api/channels', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: channelUsername, isActive: !currentStatus }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao alternar status do canal');
      }
      await fetchChannels();
      if (onChannelsChanged) onChannelsChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alternar status';
      setError(msg);
    }
  };

  const handleSyncChannel = async (channelUsername: string) => {
    setSyncingChannel(channelUsername);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/collector/fetch-more', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: channelUsername, limit: 30 }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        newOffersCount?: number;
      };

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao sincronizar mensagens do canal');
      }

      setSuccess(
        `Sincronizado! ${data.newOffersCount || 0} novas ofertas coletadas de ${channelUsername}.`
      );
      await fetchChannels();
      if (onChannelsChanged) onChannelsChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao sincronizar canal';
      setError(msg);
    } finally {
      setSyncingChannel(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0e1422] border border-white/[0.1] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col p-5 sm:p-6 shadow-2xl relative text-slate-300">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-white/[0.05] transition"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight">
              Gerenciar Canais do Telegram
            </h2>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Adicione ou remova canais e grupos de ofertas. O coletor escuta mensagens em tempo real e busca o histórico automaticamente.
        </p>

        {error && (
          <div className="mb-3.5 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-3.5 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleAddChannel} className="mb-4 p-3.5 rounded-xl bg-[#101625] border border-white/[0.07] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Adicionar Novo Canal</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchTelegramChannels}
                disabled={loadingTelegram}
                title="Atualizar lista de canais da conta Telegram"
                className="text-[11px] text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${loadingTelegram ? 'animate-spin text-indigo-400' : ''}`} />
                <span className="hidden sm:inline">Atualizar canais</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualInput((prev) => !prev);
                  setNewChannel('');
                  setNewTitle('');
                }}
                className="text-[11px] text-indigo-400/80 hover:text-indigo-300 underline transition"
              >
                {manualInput ? 'Selecionar da conta' : 'Digitar manualmente'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              {manualInput ? (
                <input
                  type="text"
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  placeholder="@nome_do_canal, t.me/canal ou ID"
                  className="w-full bg-[#0a0d16] border border-white/[0.09] rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 font-mono transition"
                  required
                  autoFocus
                />
              ) : (
                <select
                  value={newChannel}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    setNewChannel(selectedVal);
                    const selected = availableChannels.find(
                      (c) => c.identifier === selectedVal || c.username === selectedVal || c.id === selectedVal
                    );
                    if (selected && selected.title) {
                      setNewTitle(selected.title);
                    }
                  }}
                  disabled={loadingTelegram || adding}
                  className="w-full bg-[#0a0d16] border border-white/[0.09] rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition disabled:opacity-50"
                  required
                >
                  {loadingTelegram ? (
                    <option value="">Carregando canais da sua conta Telegram...</option>
                  ) : telegramError ? (
                    <option value="">Erro ao carregar canais ({telegramError})</option>
                  ) : availableChannels.length === 0 ? (
                    <option value="">
                      {telegramChannels.length === 0
                        ? 'Nenhum canal encontrado na conta'
                        : 'Todos os canais da conta já estão sendo ouvidos'}
                    </option>
                  ) : (
                    <>
                      <option value="">Selecione um canal da sua conta ({availableChannels.length} disponíveis)...</option>
                      {availableChannels.map((c) => (
                        <option
                          key={c.identifier || c.id}
                          value={c.identifier}
                          className="bg-[#0e1422] text-slate-100"
                        >
                          {c.title} {c.username ? `(${c.username})` : `[ID: ${c.id}]`}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              )}
            </div>
            <div>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Título (opcional)"
                className="w-full bg-[#0a0d16] border border-white/[0.09] rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition"
              />
            </div>
          </div>

          {telegramError && !manualInput && (
            <div className="text-[11px] text-amber-400/90 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{telegramError}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              {manualInput
                ? 'Dica: Você deve ter entrado no canal na sua conta Telegram.'
                : loadingTelegram
                ? 'Buscando canais da sua conta Telegram...'
                : availableChannels.length > 0
                ? `${availableChannels.length} canal(is) da sua conta disponível(is) para monitorar.`
                : 'Todos os canais da sua conta já estão sendo monitorados.'}
            </span>
            <button
              type="submit"
              disabled={adding || !newChannel.trim()}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition flex items-center gap-1.5 active:scale-95 shadow-xs shrink-0"
            >
              {adding ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Adicionando...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-[160px] max-h-[260px]">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1 pb-1">
            <span>Canais Cadastrados ({channels.length})</span>
            {loading && <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />}
          </div>

          {channels.length === 0 && !loading && (
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-white/[0.08] rounded-xl bg-[#0a0d16]/50">
              Nenhum canal monitorado no momento. Adicione um canal acima para iniciar o monitoramento!
            </div>
          )}

          {channels.map((ch) => {
            const cleanHandle = ch.username.replace('@', '');
            const telegramUrl = `https://t.me/${cleanHandle}`;
            const isSyncing = syncingChannel === ch.username;

            return (
              <div
                key={ch.id}
                className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 ${
                  ch.isActive
                    ? 'bg-[#101625] border-white/[0.07] hover:border-white/[0.12]'
                    : 'bg-[#101625]/40 border-white/[0.04] opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => handleToggleChannel(ch.username, ch.isActive)}
                    title={ch.isActive ? 'Clique para desativar' : 'Clique para ativar'}
                    className={`w-2 h-2 rounded-full shrink-0 transition-transform ${
                      ch.isActive
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                        : 'bg-slate-600'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-slate-100 font-medium truncate">
                        {ch.username}
                      </span>
                      {ch.title && (
                        <span className="text-[11px] text-slate-400 truncate">
                          ({ch.title})
                        </span>
                      )}
                      <a
                        href={telegramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-indigo-400 transition"
                        title="Abrir no Telegram"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3 text-slate-400" />
                        <span>{ch.productCount || 0} ofertas coletadas</span>
                      </span>
                      <span>•</span>
                      <span>{ch.isActive ? 'Monitorando' : 'Pausado'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleSyncChannel(ch.username)}
                    disabled={isSyncing}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-white/[0.06] transition disabled:opacity-50"
                    title="Puxar histórico dos últimos 7 dias deste canal"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
                  </button>

                  <button
                    onClick={() => handleRemoveChannel(ch.username)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Excluir canal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.07] flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            {channels.filter((c) => c.isActive).length} de {channels.length} canais ativos
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#101524] hover:bg-[#151c2d] text-slate-200 border border-white/[0.08] transition active:scale-95 shadow-xs"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
