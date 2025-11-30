// app/api/alerts/unresolve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { markAlertAsUnresolved } from '@/lib/alertStorage';

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    const body = await request.json();
    const { alertId, alerts_cache_key } = body;

    if (!alertId) {
      return NextResponse.json(
        { error: 'alertId is required' },
        { status: 400 }
      );
    }

    if (!alerts_cache_key) {
      return NextResponse.json(
        { error: 'alerts_cache_key is required' },
        { status: 400 }
      );
    }

    const success = await markAlertAsUnresolved(alertId, alerts_cache_key);
    
    return NextResponse.json({ 
      success,
      message: success ? 
        `Alert ${alertId} marked as unresolved and cache updated` :
        'Failed to mark alert as unresolved'
    });
  } catch (error) {
    console.error('Error unresolving alert:', { requestId, error });
    return NextResponse.json(
      { error: 'Failed to unresolve alert' },
      { status: 500 }
    );
  }
}