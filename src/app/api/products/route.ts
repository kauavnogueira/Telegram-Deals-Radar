import { NextRequest, NextResponse } from 'next/server';
import { getProducts, saveProduct, deleteProduct, clearAllProducts } from '@/lib/db';
import { parseTelegramMessage } from '@/lib/parser';
import { SortOption } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
    const store = searchParams.get('store') || undefined;
    const channel = searchParams.get('channel') || undefined;
    const channelsParam = searchParams.get('channels');
    const channels = channelsParam ? channelsParam.split(',').map((c) => c.trim()).filter(Boolean) : undefined;
    const tab = (searchParams.get('tab') as 'products' | 'coupons') || undefined;
    const hasCoupon = searchParams.get('hasCoupon') === 'true';
    const sortBy = (searchParams.get('sortBy') as SortOption) || 'date_desc';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    const data = getProducts({
      search,
      minPrice,
      maxPrice,
      store,
      channel,
      channels,
      tab,
      hasCoupon,
      sortBy,
      limit,
      offset,
    });

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawText, channelName = '@manual_input' } = body;

    if (!rawText) {
      return NextResponse.json({ error: 'Texto da mensagem é obrigatório' }, { status: 400 });
    }

    const parsed = parseTelegramMessage(rawText, {
      channelName,
      messageId: Date.now(),
    });

    if (!parsed) {
      return NextResponse.json(
        { error: 'Não foi possível extrair preço ou informações válidas desta mensagem.' },
        { status: 422 }
      );
    }

    saveProduct(parsed);
    return NextResponse.json({ success: true, product: parsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const all = searchParams.get('all') === 'true';

    if (all) {
      clearAllProducts();
      return NextResponse.json({ success: true, message: 'Todos os produtos foram removidos' });
    }

    if (id) {
      deleteProduct(id);
      return NextResponse.json({ success: true, message: `Produto ${id} removido` });
    }

    return NextResponse.json({ error: 'Informe id ou all=true' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
