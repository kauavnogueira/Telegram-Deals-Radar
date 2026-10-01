import { NextResponse } from 'next/server';
import { getStats } from '@/lib/db';

export async function GET() {
  try {
    const stats = getStats();
    return NextResponse.json(stats);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar estatísticas';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
