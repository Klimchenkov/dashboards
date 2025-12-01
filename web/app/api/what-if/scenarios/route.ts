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
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
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
    return NextResponse.json({ scenarios: whatIfData.scenarios });
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scenarios' },
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

    const newScenario = {
      id: WhatIfManager.generateId(),
      name: body.name,
      description: body.description,
      users: [],
      projects: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: false
    };

    whatIfData.scenarios.push(newScenario);
    await WhatIfManager.saveUserWhatIfData(userId, whatIfData);

    return NextResponse.json({ scenario: newScenario }, { status: 201 });
  } catch (error) {
    console.error('Error creating scenario:', error);
    return NextResponse.json(
      { error: 'Failed to create scenario' },
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
    const scenarioIndex = whatIfData.scenarios.findIndex(s => s.id === id);
    
    if (scenarioIndex === -1) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    whatIfData.scenarios[scenarioIndex] = {
      ...whatIfData.scenarios[scenarioIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };

    await WhatIfManager.saveUserWhatIfData(userId, whatIfData);

    return NextResponse.json({ scenario: whatIfData.scenarios[scenarioIndex] });
  } catch (error) {
    console.error('Error updating scenario:', error);
    return NextResponse.json(
      { error: 'Failed to update scenario' },
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
      return NextResponse.json({ error: 'Scenario ID is required' }, { status: 400 });
    }

    const whatIfData = await WhatIfManager.getUserWhatIfData(userId);
    whatIfData.scenarios = whatIfData.scenarios.filter(s => s.id !== id);
    
    // If deleting active scenario, reset active ID
    if (whatIfData.active_scenario_id === id) {
      whatIfData.active_scenario_id = undefined;
    }

    await WhatIfManager.saveUserWhatIfData(userId, whatIfData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scenario:', error);
    return NextResponse.json(
      { error: 'Failed to delete scenario' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const body = await request.json();
    const { scenarioId } = body;

    const whatIfData = await WhatIfManager.getUserWhatIfData(userId);
    
    // Deactivate all scenarios
    whatIfData.scenarios.forEach(scenario => {
      scenario.is_active = scenario.id === scenarioId;
    });
    
    whatIfData.active_scenario_id = scenarioId;

    await WhatIfManager.saveUserWhatIfData(userId, whatIfData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error activating scenario:', error);
    return NextResponse.json(
      { error: 'Failed to activate scenario' },
      { status: 500 }
    );
  }
}