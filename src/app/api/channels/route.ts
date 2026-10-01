import { NextRequest, NextResponse } from 'next/server';
import {
  getMonitoredChannels,
  addMonitoredChannel,
  removeMonitoredChannel,
  toggleMonitoredChannel,
} from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const channels = getMonitoredChannels(activeOnly);
    return NextResponse.json({ channels });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao listar canais';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      channel?: string;
      title?: string;
    };

    if (!body.channel || typeof body.channel !== 'string') {
      return NextResponse.json(
        { error: 'Parâmetro "channel" é obrigatório.' },
        { status: 400 }
      );
    }

    const result = addMonitoredChannel(body.channel, body.title);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      channel: result.channel,
      message: `Canal ${result.channel?.username} adicionado com sucesso!`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao adicionar canal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let channel = searchParams.get('channel');

    if (!channel) {
      const body = (await req.json().catch(() => ({}))) as { channel?: string };
      channel = body.channel || null;
    }

    if (!channel) {
      return NextResponse.json(
        { error: 'Parâmetro "channel" é obrigatório para remoção.' },
        { status: 400 }
      );
    }

    const removed = removeMonitoredChannel(channel);
    if (!removed) {
      return NextResponse.json(
        { error: `Canal "${channel}" não encontrado ou não pôde ser removido.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Canal ${channel} removido com sucesso.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao remover canal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      channel?: string;
      isActive?: boolean;
    };

    if (!body.channel || typeof body.isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Parâmetros "channel" e "isActive" (booleano) são obrigatórios.' },
        { status: 400 }
      );
    }

    const updated = toggleMonitoredChannel(body.channel, body.isActive);
    if (!updated) {
      return NextResponse.json(
        { error: `Canal "${body.channel}" não encontrado.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Canal ${body.channel} atualizado para ${body.isActive ? 'ativo' : 'inativo'}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar canal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
