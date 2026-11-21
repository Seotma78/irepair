import { Router, Request, Response } from 'express';

export const mapsRouter = Router();

const MAP_API_KEY = process.env.MAP_API_KEY || 'cb1_4cye_1_4067d1d4f4e3176883712d72';

// GET /api/maps/config
mapsRouter.get('/config', (req: Request, res: Response) => {
  res.json({
    active: true,
    hasKey: Boolean(MAP_API_KEY),
    provider: 'osm-carto',
  });
});

// GET /api/maps/geocode?q=...
mapsRouter.get('/geocode', async (req: Request, res: Response): Promise<any> => {
  try {
    const q = req.query.q as string;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }

    const searchQuery = `${q.trim()}, United Kingdom`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'iRepairMobilesUK/1.0 (info@irepair-mobiles.co.uk)',
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Upstream geocoding service error' });
    }

    const data = await response.json();
    const formatted = Array.isArray(data)
      ? data.map((item: any) => ({
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          displayName: item.display_name,
          type: item.type,
        }))
      : [];

    return res.json({ success: true, results: formatted });
  } catch (err: any) {
    console.error('Geocode proxy error:', err);
    return res.status(500).json({ error: 'Failed to geocode address' });
  }
});
