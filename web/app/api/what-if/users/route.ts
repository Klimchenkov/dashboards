import { NextRequest, NextResponse } from 'next/server';
import { WhatIfManager } from '@/lib/whatIfUtils';
import { getUserIdFromRequest } from '@/lib/authUtils';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const whatIfData = await WhatIfManager.getUserWhatIfData(userId);
    const users = whatIfData.scenarios
      .filter(s => s.is_active)
      .flatMap(s => s.users);

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching hypothetical users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hypothetical users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const whatIfData = await WhatIfManager.getUserWhatIfData(userId);
    
    // Создаем активный сценарий если нет
    let activeScenario = whatIfData.scenarios.find(s => s.is_active);
    if (!activeScenario) {
      activeScenario = {
        id: WhatIfManager.generateId(),
        name: 'Основной сценарий',
        description: 'Автоматически созданный сценарий',
        users: [],
        projects: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
      };
      whatIfData.scenarios.push(activeScenario);
      whatIfData.active_scenario_id = activeScenario.id;
    }

    // Создаем нового гипотетического пользователя
    const newUser = WhatIfManager.createHypotheticalUser(body);
    activeScenario.users.push(newUser);
    activeScenario.updated_at = new Date().toISOString();

    await WhatIfManager.saveUserWhatIfData(userId, whatIfData);

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Error creating hypothetical user:', error);
    return NextResponse.json(
      { error: 'Failed to create hypothetical user' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    const whatIfData = await WhatIfManager.getUserWhatIfData(userId);
    const activeScenario = whatIfData.scenarios.find(s => s.is_active);
    
    if (!activeScenario) {
      return NextResponse.json({ error: 'No active scenario found' }, { status: 404 });
    }

    const userIndex = activeScenario.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Обновляем пользователя
    activeScenario.users[userIndex] = {
      ...activeScenario.users[userIndex],
      ...updates,
      id // Ensure ID doesn't change
    };
    activeScenario.updated_at = new Date().toISOString();

    await WhatIfManager.saveUserWhatIfData(userId, whatIfData);

    return NextResponse.json({ user: activeScenario.users[userIndex] });
  } catch (error) {
    console.error('Error updating hypothetical user:', error);
    return NextResponse.json(
      { error: 'Failed to update hypothetical user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const whatIfData = await WhatIfManager.getUserWhatIfData(userId);
    const activeScenario = whatIfData.scenarios.find(s => s.is_active);
    
    if (!activeScenario) {
      return NextResponse.json({ error: 'No active scenario found' }, { status: 404 });
    }

    activeScenario.users = activeScenario.users.filter(u => u.id !== id);
    activeScenario.updated_at = new Date().toISOString();

    await WhatIfManager.saveUserWhatIfData(userId, whatIfData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting hypothetical user:', error);
    return NextResponse.json(
      { error: 'Failed to delete hypothetical user' },
      { status: 500 }
    );
  }
}