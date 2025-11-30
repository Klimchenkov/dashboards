// app/api/alerts/resolve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { markAlertAsResolved } from '@/lib/alertStorage';

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

    const success = await markAlertAsResolved(alertId, alerts_cache_key);
    
    return NextResponse.json({ 
      success,
      message: success ? 
        `Alert ${alertId} marked as resolved for 24 hours and cache updated` :
        'Failed to mark alert as resolved'
    });
  } catch (error) {
    console.error('Error resolving alert:', { requestId, error });
    return NextResponse.json(
      { error: 'Failed to resolve alert' },
      { status: 500 }
    );
  }
}