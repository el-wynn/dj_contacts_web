import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple in-memory rate limiter for API routes
 * 
 * Limits:
 * - 15 requests per minute (sliding window)
 * - 100 requests per day (fixed via cookie)
 * 
 * Note: For production use, consider Redis or another 
 * persistent store for accurate rate limiting across server restarts
 */
const rateLimits = new Map<
  string, 
  { count: number; lastReset: number }
>();

const WINDOW_SIZE_MS = 60 * 1000; // 1 minute window
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_REQUESTS_PER_MINUTE = 15;
const MAX_REQUESTS_PER_DAY = 100;

export async function rateLimiter(
  req: NextRequest,
  id: string
): Promise<NextResponse | null> {
  const now = Date.now();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  // Initialize or reset counts if window has passed
  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, { 
      count: 1,
      lastReset: now 
    });
  } else {
    const data = rateLimits.get(ip)!;
    
    // Reset minute counter if window expired
    if (now - data.lastReset > WINDOW_SIZE_MS) {
      data.count = 1;
      data.lastReset = now;
    } else {
      data.count++;
      
      // Check minute limit
      if (data.count > MAX_REQUESTS_PER_MINUTE) {
        return new NextResponse(
          JSON.stringify({ error: `Too many requests, Limit: ${MAX_REQUESTS_PER_MINUTE}/minute` }),
          { status: 429 }
        );
      }
    }
  }

  // Additional daily limit check (simple implementation)
  // In production, use Redis or database for accurate daily counting
  const dayCount = parseInt(req.cookies.get('dailyCount')?.value || '0');
  if (dayCount >= MAX_REQUESTS_PER_DAY) {
    return new NextResponse(
      JSON.stringify({ error: `Daily limit exceeded. Limit: ${MAX_REQUESTS_PER_DAY}/day` }),
      { status: 429 }
    );
  }

  // Set/update daily count cookie
  const response = NextResponse.next();
  response.cookies.set('dailyCount', (dayCount + 1).toString(), {
    maxAge: DAILY_WINDOW_MS,
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  });

  return null;
}