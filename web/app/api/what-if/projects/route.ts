import { NextRequest, NextResponse } from 'next/server';
import { WhatIfManager } from '@/lib/whatIfUtils';

// Helper to get user ID from request (same as above)
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const userId = request.headers.get('x-user-id');
  if (userId) return userId;

  const { searchParams } = new URL(request.url);
  const queryUserId = searchParams.get('userId');
  if (queryUserId) return queryUserId;

  try {
    if (request.method === 'POST' || request.method === 'PUT') {
      const body = await request.clone().json();
      return body.userId || body.user_id || null;
    }
  } catch (error) {
    // Ignore body parsing errors
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const whatIfData = await WhatIfManager.getUserWhatIfData(userId);
    const projects = whatIfData.scenarios
      .filter(s => s.is_active)
      .flatMap(s => s.projects);

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching hypothetical projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hypothetical projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const body = await request.json();
    const whatIfData = await WhatIfManager.getUserWhatIfData(userId);
    
    // Create active scenario if none exists
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

    // Create new hypothetical project
    const newProject = WhatIfManager.createHypotheticalProject(body);
    activeScenario.projects.push(newProject);
    activeScenario.updated_at = new Date().toISOString();

    await WhatIfManager.saveUserWhatIfData(userId, whatIfData);

    return NextResponse.json({ project: newProject }, { status: 201 });
  } catch (error) {
    console.error('Error creating hypothetical project:', error);
    return NextResponse.json(
      { error: 'Failed to create hypothetical project' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    const whatIfData = await WhatIfManager.getUserWhatIfData(userId);
    const activeScenario = whatIfData.scenarios.find(s => s.is_active);
    
    if (!activeScenario) {
      return NextResponse.json({ error: 'No active scenario found' }, { status: 404 });
    }

    const projectIndex = activeScenario.projects.findIndex(p => p.id === id);
    if (projectIndex === -1) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update project
    activeScenario.projects[projectIndex] = {
      ...activeScenario.projects[projectIndex],
      ...updates,
      id // Ensure ID doesn't change
    };
    activeScenario.updated_at = new Date().toISOString();

    await WhatIfManager.saveUserWhatIfData(userId, whatIfData);

    return NextResponse.json({ project: activeScenario.projects[projectIndex] });
  } catch (error) {
    console.error('Error updating hypothetical project:', error);
    return NextResponse.json(
      { error: 'Failed to update hypothetical project' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const whatIfData = await WhatIfManager.getUserWhatIfData(userId);
    const activeScenario = whatIfData.scenarios.find(s => s.is_active);
    
    if (!activeScenario) {
      return NextResponse.json({ error: 'No active scenario found' }, { status: 404 });
    }

    activeScenario.projects = activeScenario.projects.filter(p => p.id !== id);
    activeScenario.updated_at = new Date().toISOString();

    await WhatIfManager.saveUserWhatIfData(userId, whatIfData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting hypothetical project:', error);
    return NextResponse.json(
      { error: 'Failed to delete hypothetical project' },
      { status: 500 }
    );
  }
}