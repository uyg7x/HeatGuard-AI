import { NextResponse } from 'next/server';
import { getCity } from '@/lib/cities';
import { computeCityStats, generateCityHeatmapCells } from '@/lib/cityStats';

async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    let cityParam = url.searchParams.get('city');

    if (!cityParam && req.method === 'POST') {
      try {
        const body = await req.json();
        cityParam = body?.city || body?.cityId;
      } catch {
        // Body is optional
      }
    }

    const city = getCity(cityParam || 'dallas');
    const stats = computeCityStats(city);
    const cells = generateCityHeatmapCells(city, stats);

    return NextResponse.json({
      success: true,
      city: city.id,
      cityId: city.id,
      cityName: city.name,
      source: 'hyperlocal-grid-snapshot',
      shape: '25x25-grid',
      capturedAt: stats.capturedAt,
      cells,
      heatmap_data: cells,
      totalCells: cells.length,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to generate heatmap data',
      cells: [],
    }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
