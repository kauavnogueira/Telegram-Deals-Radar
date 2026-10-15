import { setTimeout as delay } from 'node:timers/promises';
import { getNotifierConfig, sendTelegramNotification } from './notifier';
import { getSubscriber, upsertSubscriber, getProducts } from './db';
import { Product } from './types';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
      title?: string;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    date: number;
    text?: string;
  };
}

let isPolling = false;
let shouldStopPolling = false;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendBotMessage(
  botToken: string,
  chatId: string | number,
  text: string,
  replyMarkup?: unknown
): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: String(chatId),
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
    });
    const data = (await res.json()) as { ok?: boolean; description?: string };
    if (!res.ok || !data.ok) {
      console.warn(`[bot] Falha ao enviar resposta para ${chatId}:`, data.description);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[bot] Erro de rede ao responder ${chatId}:`, err);
    return false;
  }
}

export async function handleBotCommand(
  chatId: string,
  text: string,
  userInfo?: { username?: string; firstName?: string }
): Promise<string> {
  const trimmed = text.trim();
  const parts = trimmed.split(/\s+/);
  const commandRaw = parts[0].toLowerCase();
  // Strip bot mention if in group, e.g. /status@RadamOfertasBot
  const command = commandRaw.split('@')[0];
  const args = trimmed.substring(parts[0].length).trim();

  // Ensure subscriber exists in DB
  const existingSub = getSubscriber(chatId);
  const currentSub = existingSub || upsertSubscriber({
    chatId,
    username: userInfo?.username,
    firstName: userInfo?.firstName,
  });

  switch (command) {
    case '/start':
    case '/ajuda':
    case '/help':
    case '/comandos': {
      const name = userInfo?.firstName ? escapeHtml(userInfo.firstName) : 'Amigo(a)';
      return `👋 <b>Olá, ${name}! Bem-vindo ao Radam das Ofertas!</b>\n\n` +
        `Configure seus alertas para receber apenas o que você procura:\n\n` +
        `🎯 <b>Filtros de Produtos:</b>\n` +
        `• <code>/filtro iphone, notebook, ps5</code>\n` +
        `  <i>Define sua lista de palavras-chave de interesse.</i>\n\n` +
        `• <code>/adicionar rtx 4060</code>\n` +
        `  <i>Adiciona um novo produto aos seus filtros atuais.</i>\n\n` +
        `• <code>/remover notebook</code>\n` +
        `  <i>Remove um produto da sua lista.</i>\n\n` +
        `• <code>/limpar</code>\n` +
        `  <i>Apaga todos os filtros (recebe todas as ofertas).</i>\n\n` +
        `💰 <b>Filtro de Desconto:</b>\n` +
        `• <code>/desconto 25</code>\n` +
        `  <i>Só avisa ofertas com 25% OFF ou mais (0 para qualquer preço).</i>\n\n` +
        `⚙️ <b>Controle de Alertas:</b>\n` +
        `• <code>/status</code> - Exibe suas preferências atuais\n` +
        `• <code>/ativar</code> - Ativa o envio de alertas\n` +
        `• <code>/desativar</code> - Pausa temporariamente os alertas\n\n` +
        `🚀 <b>Extra:</b>\n` +
        `• <code>/testar</code> - Dispara uma oferta de exemplo agora\n` +
        `• <code>/ultimas</code> - Mostra as últimas ofertas coletadas`;
    }

    case '/status':
    case '/config': {
      const statusIcon = currentSub.isEnabled ? '✅ Ativado' : '⏸️ Pausado';
      const discountText = currentSub.minDiscount > 0
        ? `A partir de <b>${currentSub.minDiscount}% OFF</b>`
        : 'Qualquer desconto (0%)';
      const keywordsText = currentSub.keywords.length > 0
        ? currentSub.keywords.map((k) => `<code>${escapeHtml(k)}</code>`).join(', ')
        : '<i>Nenhum (recebendo todas as ofertas)</i>';

      return `⚙️ <b>Suas Configurações Atuais:</b>\n\n` +
        `🔔 <b>Status:</b> ${statusIcon}\n` +
        `🏷️ <b>Desconto mínimo:</b> ${discountText}\n` +
        `🎯 <b>Palavras-chave cadastradas (${currentSub.keywords.length}):</b>\n${keywordsText}\n\n` +
        `💡 <i>Para alterar os filtros, use <code>/filtro termo1, termo2</code> ou <code>/desconto X</code>.</i>`;
    }

    case '/filtro':
    case '/filtros':
    case '/palavras': {
      if (!args) {
        return `⚠️ <b>Como usar o comando /filtro:</b>\n\n` +
          `Envie as palavras-chave separadas por vírgula. Exemplo:\n` +
          `<code>/filtro iphone 15, playstation 5, rtx 4070, air fryer</code>\n\n` +
          `💡 <i>Para limpar todos os filtros e receber tudo, use <code>/limpar</code>.</i>`;
      }

      const keywords = args
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

      if (keywords.length === 0) {
        return `⚠️ Nenhuma palavra válida encontrada. Exemplo: <code>/filtro iphone, notebook</code>`;
      }

      const updated = upsertSubscriber({
        chatId,
        keywords,
        username: userInfo?.username,
        firstName: userInfo?.firstName,
      });

      const tags = updated.keywords.map((k) => `<code>${escapeHtml(k)}</code>`).join(', ');
      return `✅ <b>Filtros atualizados com sucesso!</b>\n\n` +
        `Você receberá ofertas que contenham:\n${tags}\n\n` +
        `🏷️ Desconto mínimo atual: <b>${updated.minDiscount}% OFF</b>`;
    }

    case '/adicionar':
    case '/add': {
      if (!args) {
        return `⚠️ Informe o que deseja adicionar. Exemplo: <code>/adicionar nintendo switch</code>`;
      }

      const toAdd = args
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

      const currentSet = new Set(currentSub.keywords);
      for (const item of toAdd) {
        currentSet.add(item);
      }
      const newKeywords = Array.from(currentSet);

      const updated = upsertSubscriber({
        chatId,
        keywords: newKeywords,
      });

      const tags = updated.keywords.map((k) => `<code>${escapeHtml(k)}</code>`).join(', ');
      return `✅ <b>Filtro adicionado!</b>\n\n` +
        `Sua lista agora possui (${updated.keywords.length}) termos:\n${tags}`;
    }

    case '/remover':
    case '/del':
    case '/delete': {
      if (!args) {
        return `⚠️ Informe o que deseja remover. Exemplo: <code>/remover notebook</code>`;
      }

      const target = args.trim().toLowerCase();
      const currentList = currentSub.keywords;
      const filtered = currentList.filter((k) => k !== target && !k.includes(target));

      if (filtered.length === currentList.length) {
        return `⚠️ O termo <code>${escapeHtml(target)}</code> não foi encontrado na sua lista.\n` +
          `Use <code>/status</code> para ver sua lista atual.`;
      }

      const updated = upsertSubscriber({
        chatId,
        keywords: filtered,
      });

      const tags = updated.keywords.length > 0
        ? updated.keywords.map((k) => `<code>${escapeHtml(k)}</code>`).join(', ')
        : '<i>Nenhum (recebendo todas as ofertas)</i>';

      return `🗑️ <b>Termo removido com sucesso!</b>\n\n` +
        `Sua lista atual (${updated.keywords.length}):\n${tags}`;
    }

    case '/limpar':
    case '/limparfiltros': {
      upsertSubscriber({
        chatId,
        keywords: [],
      });

      return `🧹 <b>Todos os filtros de palavras foram removidos!</b>\n\n` +
        `Agora você receberá alertas de <b>todas</b> as promoções encontradas nos canais monitorados.`;
    }

    case '/desconto':
    case '/minimo': {
      if (!args) {
        return `⚠️ Informe a porcentagem mínima de desconto desejada.\n` +
          `Exemplo: <code>/desconto 20</code> (para ofertas a partir de 20% OFF)\n` +
          `Ou <code>/desconto 0</code> para receber qualquer desconto.`;
      }

      const num = parseInt(args.replace('%', '').trim(), 10);
      if (isNaN(num) || num < 0 || num > 99) {
        return `⚠️ Por favor informe um número válido de 0 a 99. Exemplo: <code>/desconto 15</code>`;
      }

      const updated = upsertSubscriber({
        chatId,
        minDiscount: num,
      });

      if (num === 0) {
        return `✅ <b>Filtro de desconto desativado!</b> Você receberá ofertas de qualquer valor/desconto.`;
      }

      return `✅ <b>Desconto mínimo atualizado!</b>\n` +
        `Você só será notificado de ofertas com no mínimo <b>${updated.minDiscount}% OFF</b>.`;
    }

    case '/ativar':
    case '/ligar': {
      upsertSubscriber({
        chatId,
        isEnabled: true,
      });

      return `🔔 <b>Notificações ativadas com sucesso!</b>\n` +
        `Você receberá novos alertas assim que forem encontrados nos canais.`;
    }

    case '/desativar':
    case '/pausar':
    case '/parar': {
      upsertSubscriber({
        chatId,
        isEnabled: false,
      });

      return `⏸️ <b>Notificações pausadas.</b>\n` +
        `Você não receberá alertas até enviar <code>/ativar</code> novamente.`;
    }

    case '/testar':
    case '/teste': {
      const sampleProduct: Product = {
        id: `test_${Date.now()}`,
        title: 'Smart TV 55" 4K UHD Samsung Crystal Neo',
        price: 2199.00,
        originalPrice: 2899.00,
        discountPercent: 24,
        coupon: 'DESCONTO100',
        store: 'Amazon',
        url: 'https://www.amazon.com.br',
        channelName: '@promobitoficial',
        rawText: 'Smart TV 55 4K\nDe R$ 2.899 por R$ 2.199\nCupom: DESCONTO100',
        createdAt: Date.now(),
      };

      await sendTelegramNotification(sampleProduct, chatId);
      return `🚀 <i>Oferta de teste enviada acima! Verifique a mensagem.</i>`;
    }

    case '/ultimas':
    case '/recentes': {
      const res = getProducts({ limit: 3 });
      if (!res.products || res.products.length === 0) {
        return `📭 Nenhuma oferta salva no momento. Inicie o coletor para monitorar novos produtos!`;
      }

      let msg = `🔥 <b>Últimas Ofertas Encontradas:</b>\n\n`;
      for (const p of res.products) {
        const priceFmt = p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const discountTag = p.discountPercent ? ` (-${p.discountPercent}%)` : '';
        msg += `📦 <b>${escapeHtml(p.title)}</b>\n`;
        msg += `💰 ${priceFmt}${discountTag} | 🏪 ${escapeHtml(p.store)}\n`;
        if (p.url && /^https?:\/\//i.test(p.url)) {
          msg += `🔗 <a href="${escapeHtml(p.url)}">Ver na Loja</a>\n`;
        }
        msg += `\n`;
      }
      return msg;
    }

    default: {
      return `❓ Comando não reconhecido.\n\n` +
        `Digite <code>/ajuda</code> para ver a lista de comandos disponíveis ou <code>/status</code> para ver seus filtros.`;
    }
  }
}

export async function startBotListener(): Promise<() => void> {
  const config = getNotifierConfig();
  if (!config.botToken) {
    console.warn('[bot] TELEGRAM_BOT_TOKEN não configurado. Listener de comandos desativado.');
    return () => {};
  }

  if (isPolling) {
    console.log('[bot] Listener de comandos já está em execução.');
    return stopBotListener;
  }

  isPolling = true;
  shouldStopPolling = false;

  console.log('[bot] Iniciando listener de comandos interativos do Telegram...');

  // Async polling loop
  (async () => {
    let offset = 0;

    while (isPolling && !shouldStopPolling) {
      try {
        const url = `https://api.telegram.org/bot${config.botToken}/getUpdates?offset=${offset}&timeout=25`;
        const res = await fetch(url, { signal: AbortSignal.timeout(35000) });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { description?: string };
          console.warn(`[bot] Falha ao buscar atualizações (HTTP ${res.status}):`, errData.description);
          await delay(4000);
          continue;
        }

        const data = (await res.json()) as { ok?: boolean; result?: TelegramUpdate[] };
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            offset = Math.max(offset, update.update_id + 1);

            if (update.message && update.message.text) {
              const chatId = String(update.message.chat.id);
              const text = update.message.text;
              const userInfo = {
                username: update.message.from?.username,
                firstName: update.message.from?.first_name,
              };

              console.log(`[bot] Comando recebido de ${userInfo.firstName || chatId}: ${text}`);
              const reply = await handleBotCommand(chatId, text, userInfo);
              if (reply) {
                await sendBotMessage(config.botToken, chatId, reply);
              }
            }
          }
        }
      } catch (err: unknown) {
        if (!shouldStopPolling) {
          const msg = err instanceof Error ? err.message : String(err);
          // Don't spam timeout logs
          if (!msg.includes('TimeoutError') && !msg.includes('aborted')) {
            console.warn('[bot] Erro temporário na conexão com Telegram:', msg);
          }
          await delay(2000);
        }
      }
    }

    isPolling = false;
    console.log('[bot] Listener de comandos finalizado.');
  })();

  return stopBotListener;
}

export function stopBotListener(): void {
  shouldStopPolling = true;
  isPolling = false;
}
