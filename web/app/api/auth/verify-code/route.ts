// app/api/auth/verify-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyCodeAndGetUserData } from '@/lib/authUtils';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json({ error: 'Код обязателен' }, { status: 400 });
    }

    logger.info(`Verify code request: ${code}`);
    const result = await verifyCodeAndGetUserData(code);

    if (result.success && result.userData) {
      return NextResponse.json({ 
        success: true, 
        userData: result.userData 
      });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    logger.error('Error in verify-code API:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}