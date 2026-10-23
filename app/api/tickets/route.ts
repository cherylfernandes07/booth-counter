import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

const GRADES = ['K', '1', '2', '3', '4', '5'];
const CLASSES = ['A', 'B', 'C', 'D'];
const ALL_BOOTHS = GRADES.flatMap(g => CLASSES.map(c => `${g}-${c}`));

// GET /api/tickets — returns all booth counts
export async function GET() {
  try {
    // Fetch all counts in one pipeline call
    const pipeline = kv.pipeline();
    for (const id of ALL_BOOTHS) {
      pipeline.get(`booth:${id}`);
    }
    const results = await pipeline.exec();

    const counts: Record<string, number> = {};
    ALL_BOOTHS.forEach((id, i) => {
      counts[id] = Number(results[i]) || 0;
    });

    return NextResponse.json({ counts });
  } catch (err) {
    console.error('GET /api/tickets error:', err);
    return NextResponse.json({ error: 'Failed to fetch counts' }, { status: 500 });
  }
}

// POST /api/tickets — update one booth count
// Body: { boothId: "K-A", count: 5 }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { boothId, count } = body;

    if (!ALL_BOOTHS.includes(boothId)) {
      return NextResponse.json({ error: 'Invalid booth ID' }, { status: 400 });
    }

    const safeCount = Math.max(0, Number(count) || 0);
    await kv.set(`booth:${boothId}`, safeCount);

    return NextResponse.json({ boothId, count: safeCount });
  } catch (err) {
    console.error('POST /api/tickets error:', err);
    return NextResponse.json({ error: 'Failed to update count' }, { status: 500 });
  }
}
