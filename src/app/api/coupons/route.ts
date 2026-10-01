import { NextRequest, NextResponse } from 'next/server';
import { getCoupons, deleteCoupon } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const store = searchParams.get('store') || undefined;
    const channel = searchParams.get('channel') || undefined;
    const channelsParam = searchParams.get('channels');
    const channels = channelsParam ? channelsParam.split(',').map((c) => c.trim()).filter(Boolean) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    const data = getCoupons({
      search,
      store,
      channel,
      channels,
      limit,
      offset,
    });

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Informe id do cupom' }, { status: 400 });
    }

    deleteCoupon(id);
    return NextResponse.json({ success: true, message: `Cupom ${id} removido` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
