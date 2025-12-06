import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function main() {
  const days = Number(process.env.BACKFILL_DAYS || 30);
  const limit = Number(process.env.BACKFILL_LIMIT || 200);

  console.log(`Backfilling delivery distances for last ${days} days (limit ${limit})`);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: deliveries, error } = await supabase
    .from('deliveries')
    .select('id, pickup_latitude, pickup_longitude, delivery_latitude, delivery_longitude, distance_km')
    .gte('created_at', since)
    .or('distance_km.is.null,distance_km.eq.0')
    .limit(limit);

  if (error) {
    console.error('Failed to fetch deliveries', error);
    process.exit(1);
  }

  const updates = [];

  for (const d of deliveries || []) {
    const { id, pickup_latitude, pickup_longitude, delivery_latitude, delivery_longitude } = d;
    if (
      pickup_latitude === null || pickup_latitude === undefined ||
      pickup_longitude === null || pickup_longitude === undefined ||
      delivery_latitude === null || delivery_latitude === undefined ||
      delivery_longitude === null || delivery_longitude === undefined
    ) {
      continue;
    }
    const distanceKm = haversineDistanceKm(
      Number(pickup_latitude),
      Number(pickup_longitude),
      Number(delivery_latitude),
      Number(delivery_longitude)
    );

    updates.push({ id, distance_km: Number(distanceKm.toFixed(2)), distance: distanceKm });
  }

  console.log(`Prepared ${updates.length} updates`);

  while (updates.length) {
    const chunk = updates.splice(0, 50);
    const { error: updateError } = await supabase.from('deliveries').upsert(chunk, { onConflict: 'id' });
    if (updateError) {
      console.error('Failed during upsert chunk', updateError);
      process.exit(1);
    }
    console.log(`Updated chunk (${chunk.length})`);
  }

  console.log('Done');
}

main().catch((err) => {
  console.error('Unexpected error in backfill', err);
  process.exit(1);
});
