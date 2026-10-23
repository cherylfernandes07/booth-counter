import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_API_TOKEN!,
  
});

const GRADES = ['K', '1', '2', '3', '4', '5'];
const CLASSES = ['A', 'B', 'C', 'D'];
const ALL_BOOTHS = GRADES.flatMap(g => CLASSES.map(c => `${g}-${c}`));

// GET /api/tickets — returns all booth counts and custom names
export async function GET() {
  try {
    const pipeline = kv.pipeline();
    for (const id of ALL_BOOTHS) {
      pipeline.get(`booth:${id}`);
    }
    for (const id of ALL_BOOTHS) {
      pipeline.get(`name:${id}`);
    }
    const results = await pipeline.exec();

    const counts: Record<string, number> = {};
    const names: Record<string, string> = {};

    ALL_BOOTHS.forEach((id, i) => {
      counts[id] = Number(results[i]) || 0;
    });
    ALL_BOOTHS.forEach((id, i) => {
      const customName = results[ALL_BOOTHS.length + i];
      if (customName) names[id] = customName as string;
    });

    return NextResponse.json({ counts, names });
  } catch (err) {
    console.error('GET /api/tickets error:', err);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// POST /api/tickets — update count or name
// Body: { boothId, count } OR { boothId, name }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { boothId, count, name } = body;

    if (!ALL_BOOTHS.includes(boothId)) {
      return NextResponse.json({ error: 'Invalid booth ID' }, { status: 400 });
    }

    if (name !== undefined) {
      const safeName = String(name).slice(0, 40).trim();
      if (safeName) {
        await kv.set(`name:${boothId}`, safeName);
      } else {
        await kv.del(`name:${boothId}`);
      }
      return NextResponse.json({ boothId, name: safeName });
    }

    const safeCount = Math.max(0, Number(count) || 0);
    await kv.set(`booth:${boothId}`, safeCount);
    return NextResponse.json({ boothId, count: safeCount });

  } catch (err) {
    console.error('POST /api/tickets error:', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
