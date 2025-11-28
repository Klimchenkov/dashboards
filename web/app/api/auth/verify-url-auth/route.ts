import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserData } from '@/lib/authUtils';
import logger from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { user_id, code } = await request.json();
    
    if (!user_id || !code) {
      return NextResponse.json({ error: 'user_id и code обязательны' }, { status: 400 });
    }

    logger.info(`URL auth attempt for user_id: ${user_id}, code: ${code}`);

    // First, verify the user exists with the given user_id and code (telegram_name)
    const { data: authUser, error: authError } = await supabase
      .from('setters_users_auth_codes')
      .select('*')
      .eq('user_id', user_id)
      .eq('code', code)
      .single();

    if (authError || !authUser) {
      logger.warn(`URL auth failed - user not found: user_id=${user_id}, code=${code}`);
      return NextResponse.json({ error: 'Пользователь не найден или неверные данные' }, { status: 401 });
    }

    // Get full user data with departments and projects (same as verifyCodeAndGetUserData)
    const { data: user } = await supabase
      .from('setters_users')
      .select('*')
      .eq('id', authUser.user_id)
      .single();

    if (!user) {
      logger.error(`User not found after auth: ${authUser.id}`);
      return NextResponse.json({ error: 'Ошибка получения данных пользователя' }, { status: 500 });
    }

    // Get departments where user is lead
    const { data: leadDepartments } = await supabase
      .from('departments')
      .select('id')
      .eq('lead_tg_id', user.telegram_id);

    // Get projects where user is lead
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

    logger.info(`URL authentication successful for user: ${user.id}`);

    return NextResponse.json({ 
      success: true, 
      userData 
    });

  } catch (error) {
    logger.error('Error in verify-url-auth API:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}