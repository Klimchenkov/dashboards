// lib/authUtils.ts
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { redis } from './redis';
import logger from './logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const getUserId = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userId') || 'demo-user-123';
  }
  return 'demo-user-123';
};

export interface UserData {
  id: number;
  telegram_id: number;
  name: string;
  full_access: boolean;
  lead_departments: number[];
  lead_projects: number[];
}

export async function generateAndSendCode(telegramName: string): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info(`Generating code for telegram ID: ${telegramName}`);
    
    // Проверяем существование пользователя
    const { data: user, error } = await supabase
      .from('setters_users')
      .select('*')
      .eq('telegram_name', telegramName)
      .single();

    if (error || !user) {
      logger.warn(`User not found with telegram UserName: ${telegramName}`);
      return { success: false, error: 'Пользователь не найден' };
    }

    // Генерируем 6-значный код
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeKey = `auth:code:${code}`;
    const codeData = {
      telegramName,
      userId: user.id,
      timestamp: Date.now()
    };

    // Сохраняем код в Redis на 3 минуты
    if (redis) {
      await redis.setex(codeKey, 180, JSON.stringify(codeData));
      logger.info(`Code generated for user ${user.id}: ${code}`);
    } else {
      logger.error('Redis client not available');
      return { success: false, error: 'Ошибка сервера' };
    }

    // Отправляем код через Telegram бота
    const botToken = process.env.NEXT_PUBLIC_BOT_API;
    if (!botToken) {
      logger.error('Telegram bot token not found');
      return { success: false, error: 'Ошибка конфигурации' };
    }

    const message = `Ваш код для входа в SETTERS Dashboard: ${code}\nКод действителен 3 минуты.`;
    // const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${user.telegram_id}&text=${encodeURIComponent(message)}`;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=53527242&text=${encodeURIComponent(message)}`;

    const response = await fetch(url);
    const result = await response.json();

    if (!result.ok) {
      logger.error('Failed to send Telegram message:', result);
      return { success: false, error: 'Не удалось отправить сообщение в Telegram' };
    }

    logger.info(`Code sent successfully to user ${user.id}`);
    return { success: true };
  } catch (error) {
    logger.error('Error in generateAndSendCode:', error);
    return { success: false, error: 'Внутренняя ошибка сервера' };
  }
}

export async function verifyCodeAndGetUserData(code: string): Promise<{ success: boolean; userData?: UserData; error?: string }> {
  try {
    logger.info(`Verifying code: ${code}`);
    
    if (!redis) {
      return { success: false, error: 'Ошибка сервера' };
    }

    const codeKey = `auth:code:${code}`;
    const codeDataStr = await redis.get(codeKey);

    if (!codeDataStr) {
      logger.warn(`Invalid or expired code: ${code}`);
      return { success: false, error: 'Неверный или просроченный код' };
    }

    const codeData = JSON.parse(codeDataStr);
    
    // Удаляем использованный код
    await redis.del(codeKey);

    // Получаем полные данные пользователя
    const { data: user } = await supabase
      .from('setters_users')
      .select('*')
      .eq('id', codeData.userId)
      .single();

    if (!user) {
      logger.error(`User not found with ID: ${codeData.userId}`);
      return { success: false, error: 'Пользователь не найден' };
    }

    // Получаем отделы, где пользователь является лидом
    const { data: leadDepartments } = await supabase
      .from('departments')
      .select('id')
      .eq('lead_tg_id', user.telegram_id);

    // Получаем проекты, где пользователь является лидом
    const { data: leadProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('lead_id', user.id);

    const userData: UserData = {
      id: user.id,
      telegram_id: user.telegram_id,
      name: user.name,
      full_access: user.full_access || false,
      lead_departments: leadDepartments?.map(dept => dept.id) || [],
      lead_projects: leadProjects?.map(project => project.id) || []
    };

    // Сохраняем пользовательские данные в Redis для быстрого доступа
    const userKey = `user:${user.id}`;
    await redis.setex(userKey, 86400, JSON.stringify(userData)); // 24 часа

    logger.info(`User authenticated successfully: ${user.id}`);
    return { success: true, userData };
  } catch (error) {
    logger.error('Error in verifyCodeAndGetUserData:', error);
    return { success: false, error: 'Внутренняя ошибка сервера' };
  }
}

export async function getUserDataFromStorage(userId: string): Promise<UserData | null> {
  try {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem('userData');
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Пытаемся получить из Redis
    if (redis) {
      const userKey = `user:${userId}`;
      const userDataStr = await redis.get(userKey);
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        localStorage.setItem('userData', JSON.stringify(userData));
        return userData;
      }
    }
    
    return null;
  } catch (error) {
    logger.error('Error getting user data from storage:', error);
    return null;
  }
}

export async function getUserIdFromRequest(request: NextRequest, body?: any): Promise<string | null> {
  // Try headers first
  const headerUserId = request.headers.get('x-user-id') || 
                       request.headers.get('user-id') ||
                       request.headers.get('telegram-id');

  if (headerUserId) {
    return headerUserId;
  }

  // If body is provided, try to get from body
  if (body) {
    const bodyUserId = body.userId || body.user_id || body.telegram_id;
    if (bodyUserId) {
      return bodyUserId.toString();
    }
  }

  // Try query parameters as last resort
  const { searchParams } = new URL(request.url);
  return searchParams.get('userId') || searchParams.get('user_id') || null;
}