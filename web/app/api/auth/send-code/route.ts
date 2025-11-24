// app/api/auth/send-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateAndSendCode } from '@/lib/authUtils';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { telegramName } = await request.json();
    
    if (!telegramName) {
      return NextResponse.json({ error: 'Telegram ID обязателен' }, { status: 400 });
    }

    logger.info(`Send code request for telegram ID: ${telegramName}`);
    const result = await generateAndSendCode(telegramName);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    logger.error('Error in send-code API:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}