import { Product, Coupon } from './types';

export function parseBrlPrice(valueStr: string): number | null {
  if (!valueStr || valueStr.includes('%')) return null;

  const cleaned = valueStr.replace(/[^\d.,]/g, '').trim();
  if (!cleaned) return null;

  if (cleaned.includes(',')) {
    const standardized = cleaned.replace(/\./g, '').replace(',', '.');
    const val = parseFloat(standardized);
    return isNaN(val) ? null : Number(val.toFixed(2));
  }

  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      const val = parseFloat(cleaned.replace(/\./g, ''));
      return isNaN(val) ? null : Number(val.toFixed(2));
    }
    const afterDot = parts[1];
    if (afterDot.length === 3) {
      const val = parseFloat(cleaned.replace(/\./g, ''));
      return isNaN(val) ? null : Number(val.toFixed(2));
    }
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : Number(val.toFixed(2));
  }

  const val = parseFloat(cleaned);
  return isNaN(val) ? null : Number(val.toFixed(2));
}

const STORE_PATTERNS: readonly [string, RegExp][] = [
  ['Amazon', /\b(?:amazon|amzn\.to)\b/i],
  ['Shopee', /\b(?:shopee|shope\.ee)\b/i],
  ['Mercado Livre', /\b(?:mercadolivre|meli\.la|mercado\s*livre)\b/i],
  ['Magalu', /\b(?:magazineluiza|magazinevoce|magalu|magazine\s*luiza)\b/i],
  ['AliExpress', /\b(?:aliexpress|ali\.ski|ali\s*express)\b/i],
  ['KaBuM!', /\bkabum\b/i],
  ['Terabyte', /\bterabyte(?:shop)?\b/i],
  ['Pichau', /\bpichau\b/i],
  ['Casas Bahia', /\bcasas\s*bahia\b/i],
];

export function detectStore(url: string = '', text: string = ''): string {
  if (url && url !== '#') {
    const match = STORE_PATTERNS.find(([, regex]) => regex.test(url));
    if (match) return match[0];
  }
  if (text) {
    const match = STORE_PATTERNS.find(([, regex]) => regex.test(text));
    if (match) return match[0];
  }
  return 'Outro';
}

const IGNORED_COUPON_WORDS: Record<string, true> = {
  resgate: true, apenas: true, todos: true, clique: true, pegar: true, confira: true, anuncio: true, acesse: true,
  link: true, aqui: true, abaixo: true, oferta: true, gratis: true, frete: true, valido: true, desta: true,
  pagina: true, compre: true, use: true, insira: true, desconto: true, cupom: true, codigo: true, codigos: true,
  kabum: true, shopee: true, amazon: true, magalu: true, aliexpress: true, exclusivo: true, especial: true,
  prime: true, novo: true, secreto: true, do: true, da: true, de: true, no: true, na: true, para: true, com: true
};

export function extractCoupon(text: string): string | null {
  const highPrecisionPatterns = [
    /CUPOM\s*[:=]\s*[`"']?([A-Za-z0-9_-]{3,20})[`"']?/i,
    /(?:🎟️|🎫|🏷️|🏷|🔖)\s*(?:Cupom|C[oó]digo)?\s*[:=]\s*[`"']?([A-Za-z0-9_-]{3,20})[`"']?/iu,
    /use\s+o\s+cupom\s+([A-Za-z0-9_-]{3,20})/i,
    /cupom\s*:\s*([A-Za-z0-9_-]{3,20})/i,
    /em\s+selecionados\s*:\s*([A-Za-z0-9_-]{3,20})/i,
  ];

  for (const regex of highPrecisionPatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (!IGNORED_COUPON_WORDS[candidate.toLowerCase()] && !/^\d+$/.test(candidate)) {
        return candidate.toUpperCase();
      }
    }
  }

  const generalCupomMatches = text.matchAll(/(?:cupom|c[oó]digo)\s+(?:de\s+desconto\s+)?([A-Z0-9]{4,20})\b/gi);
  for (const m of generalCupomMatches) {
    const candidate = m[1].trim();
    if (!IGNORED_COUPON_WORDS[candidate.toLowerCase()] && !/^\d+$/.test(candidate)) {
      return candidate.toUpperCase();
    }
  }

  return null;
}

export function extractDiscountDescription(text: string): string | null {
  const percentMatch = text.match(/(\d{1,2}%\s*(?:OFF|de desconto))/i);
  if (percentMatch) return percentMatch[1].toUpperCase();

  const valueOffMatch = text.match(/(R\$\s*[\d\.,]+\s*OFF)/i);
  if (valueOffMatch) return valueOffMatch[1].toUpperCase();

  const descValMatch = text.match(/(?:desconto de\s*R\$\s*([\d\.,]+))/i);
  if (descValMatch) return `R$ ${descValMatch[1]} OFF`;
  return null;
}

export function extractMinSpend(text: string): number | null {
  const match = text.match(/(?:acima de|compras de|a partir de|m[íi]nimo de)\s*R\$\s*([\d\.,]+)/i);
  if (match) {
    const val = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
    return isNaN(val) ? null : val;
  }
  return null;
}

export function parseTelegramCoupon(
  rawText: string,
  options: {
    channelName: string;
    messageId?: number;
    createdAt?: number;
  }
): Coupon | null {
  if (!rawText || rawText.trim().length < 8) return null;

  const code = extractCoupon(rawText);
  if (!code) return null;

  const urls = extractUrls(rawText);
  const url = urls.length > 0 ? urls[0] : '#';
  const store = detectStore(url, rawText);
  const discountDescription = extractDiscountDescription(rawText);
  const minSpend = extractMinSpend(rawText);

  let title = '';
  if (discountDescription && minSpend) {
    title = `${discountDescription} acima de R$ ${minSpend.toLocaleString('pt-BR')}`;
  } else if (discountDescription) {
    title = `${discountDescription} em ${store}`;
  } else if (minSpend) {
    title = `Cupom para compras acima de R$ ${minSpend.toLocaleString('pt-BR')}`;
  } else {
    title = `Cupom de Desconto ${store}`;
  }

  const cleanStore = store.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanCode = code.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const id = `coupon_${cleanStore}_${cleanCode}`;

  return {
    id,
    code,
    store,
    title,
    discountDescription,
    minSpend,
    channelName: options.channelName,
    url,
    rawText,
    createdAt: options.createdAt || Date.now(),
  };
}

export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
  const matches = text.match(urlRegex) || [];
  return matches.map((u) => u.replace(/[.,;:)]+$/, ''));
}

export function extractProductUrl(rawText: string): string {
  const lines = rawText.split('\n');
  const allUrls = extractUrls(rawText);
  if (allUrls.length <= 1) return allUrls[0] || '';

  const productMarkers = [
    /(?:link(?:\s+(?:do|da))?\s*(?:produto|oferta)?|compre aqui|pegar promo[cç][aã]o|🛒|🎮👉|👉|🔗)\s*[:=]?\s*(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/i,
    /(?:^|\s)link\s*[:=]?\s*(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/i,
  ];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      lower.includes('resgate') ||
      lower.includes('todos os cupons') ||
      lower.includes('amazon prime (30 dias') ||
      lower.includes('primecampaignid') ||
      lower.includes('grupo') ||
      lower.includes('whatsapp')
    ) {
      continue;
    }

    for (const marker of productMarkers) {
      const match = line.match(marker);
      if (match && match[1]) {
        return match[1].replace(/[.,;:)]+$/, '');
      }
    }
  }

  for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i].trim().toLowerCase();
    const nextLine = lines[i + 1].trim();
    if (
      (currentLine.includes('link') ||
        currentLine.includes('produto') ||
        currentLine.includes('pegar promoção') ||
        currentLine.includes('🛒') ||
        currentLine.includes('🔗')) &&
      !currentLine.includes('cupom') &&
      !currentLine.includes('resgate') &&
      !currentLine.includes('prime')
    ) {
      const urlsInNext = extractUrls(nextLine);
      if (urlsInNext.length > 0) {
        return urlsInNext[0];
      }
    }
  }

  const candidateUrls = allUrls.filter((u) => {
    const lower = u.toLowerCase();
    if (lower.includes('amazon.com.br/prime') || lower.includes('primecampaignid')) return false;
    if (lower.includes('t.me/') || lower.includes('whatsapp.com/')) return false;
    return true;
  });

  for (const u of candidateUrls) {
    const urlIndex = rawText.indexOf(u);
    if (urlIndex > -1) {
      const before = rawText.slice(Math.max(0, urlIndex - 60), urlIndex).toLowerCase();
      if (before.includes('resgate') || before.includes('todos os cupom')) {
        continue;
      }
    }
    return u;
  }

  return candidateUrls[0] || allUrls[0] || '';
}

export const KNOWN_STORE_NAMES = [
  'amazon',
  'shopee',
  'mercado livre',
  'mercadolivre',
  'meli',
  'kabum',
  'magalu',
  'magazine luiza',
  'aliexpress',
  'terabyte',
  'terabyteshop',
  'pichau',
  'fast shop',
  'casas bahia',
  'ponto frio',
  'carrefour',
  'girafa',
  'submarino',
  'americanas',
  'shoptime',
] as const;

export const MARKETING_HEADLINES = [
  'menor preco',
  'menor preco historico',
  'historico',
  'achadinho',
  'achadinhos',
  'achado',
  'achados',
  'super oferta',
  'corre',
  'corram',
  'imperdivel',
  'vai acabar',
  'promocao relampago',
  'alerta de oferta',
  'alerta de preco',
  'olha isso',
  'olha so',
  'olha essa',
  'baixou',
  'despencou',
  'oferta imperdivel',
  'mega oferta',
  'super promo',
  'confira',
  'oportunidade',
  'apenas meli',
  'apenas meli+',
  'exclusivo prime',
  'exclusivo meli',
  'so hoje',
  'so agora',
  'resgate aqui',
  'resgate o cupom',
  'pegue aqui',
  'clique aqui',
  'compre aqui',
  'headshot no preco',
  'anuncio',
  '#anuncio',
  '#publi',
  'publi',
  'publicidade',
  'atencao',
  'estoque sujeito',
  'parcelado',
  'sem juros',
  'no pix',
  'a vista',
  'frete gratis',
  'esgotando',
  'ultimas unidades',
  'campear esse preco',
  'campear esse',
  'amazon prime',
  '30 dias gratis',
  'teste gratis',
  'prime video',
  'grupo vip',
  'canal vip',
  'participe do grupo',
] as const;

export function isStoreBanner(rawLine: string): boolean {
  if (!rawLine) return false;
  const normalized = rawLine
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  let text = normalized
    .replace(/[\s\p{Extended_Pictographic}\uFE0E\uFE0F#\-–—!?:;()[\]{}|/\\<>•·~^]+/giu, ' ')
    .trim();

  if (!text) return false;

  text = text
    .replace(/^(?:loja|na|no|em|pela|pelo|vendido por|vendido e entregue por|compre na|compre no|ofertas?|promocao|promocoes|achados?)\s+/gi, '')
    .replace(/\s+(?:brasil|br|oficial|store|marketplace|online|app)$/gi, '')
    .trim();

  for (const s of KNOWN_STORE_NAMES) {
    const sNorm = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (text === sNorm || text === sNorm.replace(/\s+/g, '')) {
      return true;
    }
  }

  for (const s of KNOWN_STORE_NAMES) {
    const sNorm = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (normalized.includes(sNorm)) {
      if (/headshot\s+no\s+pre[cç]o/i.test(normalized)) return true;
      if (/^(?:alerta|plant[aã]o|radar|achado(?:s)?|oferta(?:s)?|promo[cç][aã]o)\s+(?:de\s+)?(?:ofertas?|pre[cç]o)?\s*[-–—|:]\s*/i.test(normalized)) return true;
    }
  }

  return false;
}

export function isMarketingHeadline(rawLine: string): boolean {
  if (!rawLine) return false;
  const norm = rawLine
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return MARKETING_HEADLINES.some((s) => norm.includes(s));
}

export function cleanTitle(rawLine: string): string {
  if (!rawLine) return '';
  return rawLine
    .replace(/[*~`]/g, '')
    .replace(/(^|\s)__?([^_]+)__?(?=\s|$|[.,:;!])/g, '$1$2')
    .replace(/^[\s\p{Extended_Pictographic}\uFE0E\uFE0F#\-–—!?:;()[\]{}|/\\<>•·~^]+/giu, '')
    .replace(/^(?:oferta(?:s|\s+rel[aâ]mpago)?|promo[cç][aã]o(?:es)?|imperd[ií]vel|achado(?:s)?|menor\s+pre[cç]o|alerta(?:\s+de\s+oferta|\s+de\s+pre[cç]o)?):?\s*/giu, '')
    .replace(/^[\s\p{Extended_Pictographic}\uFE0E\uFE0F#\-–—!?:;()[\]{}|/\\<>•·~^]+/giu, '')
    .replace(/[\s\p{Extended_Pictographic}\uFE0E\uFE0F#\-–—!?:;*~^]+$/giu, '')
    .replace(/[\uD800-\uDFFF]/g, '')
    .trim();
}

function isSkippableTitleLine(line: string): boolean {
  if (!line) return true;
  if (line.includes('http://') || line.includes('https://')) return true;
  if (/^(?:cupom|c[oó]digo|🎟️|🎫|🏷️|🏷|🔖)\s*[:=]?/iu.test(line)) return true;
  if (/^\d{1,2}\s*x\s*(?:de)?/i.test(line)) return true;
  if (/(?:em\s+at[eé]\s+\d{1,2}x|sem\s+juros|no\s+pix|a\s+vista|com\s+cashback)/i.test(line)) return true;
  if (/(?:campear\s+esse|estoque\s+sujeito|an[uú]ncio|#publi|resgate\s+o\s+cupom|use\s+o\s+cupom)/i.test(line)) return true;

  const cleaned = cleanTitle(line);
  if (!cleaned) return true;

  if (/^(?:🏆|💀|💰|💵|💳|💸|🏷️|🏷)?\s*(?:r\$|por\s*r\$|de\s*r\$)/i.test(line.trim())) return true;
  if (/^(?:r\$|por|de)\s*r?\$?\s*[\d.,]+/i.test(cleaned)) return true;
  if (/^r\$\s*[\d.,]+$/i.test(cleaned)) return true;

  if (isStoreBanner(line) || isStoreBanner(cleaned)) return true;
  if (isMarketingHeadline(line) || isMarketingHeadline(cleaned)) return true;

  return false;
}

export function extractProductTitle(rawText: string): string {
  if (!rawText) return 'Produto em Oferta';

  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return 'Produto em Oferta';

  const candidates: string[] = [];
  for (const line of lines) {
    if (isSkippableTitleLine(line)) continue;
    const cleaned = cleanTitle(line);
    if (isStoreBanner(cleaned)) continue;
    if (cleaned.length > 3) {
      candidates.push(cleaned);
    }
  }

  let title = '';
  if (candidates.length === 0) {
    for (const line of lines) {
      if (line.includes('http://') || line.includes('https://')) continue;
      const cleaned = cleanTitle(line);
      if (isStoreBanner(cleaned)) continue;
      if (cleaned.length > 3) {
        title = cleaned;
        break;
      }
    }
    if (!title) {
      title = cleanTitle(lines[0]) || 'Produto em Oferta';
    }
  } else if (candidates.length === 1) {
    title = candidates[0];
  } else {
    const first = candidates[0];
    const second = candidates[1];
    const isFirstAllUpper = first === first.toUpperCase() && /[A-Z]/.test(first);
    if (isFirstAllUpper && first.length < 28 && second.length > first.length) {
      title = second;
    } else {
      title = first;
    }
  }

  if (isStoreBanner(title)) {
    title = 'Produto em Oferta';
  }

  if (title.length > 180) {
    title = title.substring(0, 177) + '...';
  }

  return title;
}

function isDiscountOrCouponValue(text: string, index: number, matchLen: number): boolean {
  const after = text.slice(index + matchLen, index + matchLen + 25).toLowerCase();
  if (/^\s*(?:%|off\b|de desconto|em\s*r\$)/i.test(after)) return true;
  const before = text.slice(Math.max(0, index - 35), index).toLowerCase();
  if (/(?:até|limite|cupom|desconto|economize|resgate|em|acima de|a partir de|compras de)\s*$/i.test(before)) return true;
  return false;
}

export function extractAccuratePrices(rawText: string): {
  price: number | null;
  originalPrice: number | null;
} {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  let originalPrice: number | null = null;
  let price: number | null = null;

  for (const line of lines) {
    const sameLineDePor = line.match(
      /(?:de|era|de:)\s*R\$\s*([\d\.,]+)[^\n\r]*?(?:por|para|por:|apenas|sai por|→|\|)\s*R\$\s*([\d\.,]+)/i
    );
    if (sameLineDePor) {
      const orig = parseBrlPrice(sameLineDePor[1]);
      const pr = parseBrlPrice(sameLineDePor[2]);
      if (orig && pr && orig > pr) {
        return { originalPrice: orig, price: pr };
      }
    }
  }

  for (let i = 0; i < lines.length - 1; i++) {
    const cur = lines[i];
    const nxt = lines[i + 1];
    const deMatch = cur.match(/^(?:⛔\s*)?(?:de|era|valor original)\s*[:]?\s*R\$\s*([\d\.,]+)/i);
    const porMatch = nxt.match(/^(?:✅\s*)?(?:por|para|por:|apenas|sai por|valor)\s*[:]?\s*R\$\s*([\d\.,]+)/i);
    if (deMatch && porMatch) {
      const orig = parseBrlPrice(deMatch[1]);
      const pr = parseBrlPrice(porMatch[1]);
      if (orig && pr && orig > pr) {
        return { originalPrice: orig, price: pr };
      }
    }
  }

  const explicitFinalPatterns = [
    /(?:à vista|no pix|no boleto|pix)\s*[:=]?\s*(?:por)?\s*R\$\s*([\d\.,]+)/i,
    /(?:por apenas|por:|sai por|apenas|preço:|valor:)\s*R\$\s*([\d\.,]+)/i,
    /R\$\s*([\d\.,]+)\s*(?:à vista|no pix|no boleto)/i,
    /[💰💵🏆💶]\s*(?:por)?\s*R\$\s*([\d\.,]+)/i,
  ];

  for (const regex of explicitFinalPatterns) {
    const match = rawText.match(regex);
    if (match && match[1] && match.index !== undefined) {
      if (isDiscountOrCouponValue(rawText, match.index, match[0].length)) continue;
      const val = parseBrlPrice(match[1]);
      if (val && val > 0) {
        price = val;
        break;
      }
    }
  }

  const origPattern = /(?:^|\n)\s*(?:⛔\s*)?(?:de|era|valor original)\s*[:]?\s*R\$\s*([\d\.,]+)/i;
  const origMatch = rawText.match(origPattern);
  if (origMatch && origMatch[1] && origMatch.index !== undefined) {
    if (!isDiscountOrCouponValue(rawText, origMatch.index, origMatch[0].length)) {
      const val = parseBrlPrice(origMatch[1]);
      if (val && val > 0 && (!price || val > price)) {
        originalPrice = val;
      }
    }
  }

  if (!price) {
    const validCandidatePrices: number[] = [];

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (/\d{1,2}\s*x\s*(?:de)?\s*R\$/i.test(line)) continue;
      if (lower.includes('frete')) continue;
      if (
        lower.includes('cupom') ||
        lower.includes('resgate') ||
        lower.includes('limite') ||
        lower.includes('cashback') ||
        lower.includes('off em r$') ||
        lower.includes('off acima') ||
        lower.includes('off:') ||
        lower.includes('a partir de r$')
      ) {
        continue;
      }

      const linePricesMatches = line.matchAll(/R\$\s*([\d\.,]+)/gi);
      for (const m of linePricesMatches) {
        if (m.index !== undefined && isDiscountOrCouponValue(line, m.index, m[0].length)) {
          continue;
        }
        const parsed = parseBrlPrice(m[1]);
        if (parsed && parsed > 0) {
          validCandidatePrices.push(parsed);
        }
      }
    }

    if (validCandidatePrices.length > 0) {
      price = validCandidatePrices[0];
    }
  }

  if (!price) {
    const installmentMatch = rawText.match(/(\d{1,2})\s*x\s*(?:de)?\s*R\$\s*([\d\.,]+)/i);
    if (installmentMatch) {
      const times = parseInt(installmentMatch[1], 10);
      const val = parseBrlPrice(installmentMatch[2]);
      if (times > 0 && val && val > 0) {
        price = Number((times * val).toFixed(2));
        originalPrice = null;
      }
    }
  }

  if (originalPrice !== null && price !== null && originalPrice <= price) {
    originalPrice = null;
  }

  return { price, originalPrice };
}

export function parseTelegramMessage(
  rawText: string,
  options: {
    messageId?: number;
    channelName: string;
    channelId?: string;
  }
): Product | null {
  if (!rawText || rawText.trim().length < 10) {
    return null;
  }

  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const primaryUrl = extractProductUrl(rawText);
  const { price, originalPrice } = extractAccuratePrices(rawText);

  if (!price || price <= 0) {
    return null;
  }

  const coupon = extractCoupon(rawText);

  let discountPercent: number | null = null;
  if (originalPrice && originalPrice > price) {
    discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
  } else {
    const offMatch = rawText.match(/(\d{1,2})%\s*(?:off|de desconto)/i);
    if (offMatch) {
      discountPercent = parseInt(offMatch[1], 10);
    }
  }

  const store = detectStore(primaryUrl, rawText);
  const title = extractProductTitle(rawText);
  const id = options.messageId
    ? `${options.channelName.replace('@', '')}_${options.messageId}`
    : `${options.channelName.replace('@', '')}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  return {
    id,
    telegramMessageId: options.messageId,
    channelName: options.channelName,
    channelId: options.channelId,
    title,
    price,
    originalPrice: originalPrice && originalPrice > price ? originalPrice : null,
    discountPercent,
    coupon,
    url: primaryUrl || '#',
    store,
    rawText,
    imageUrl: null,
    createdAt: Date.now(),
  };
}
