import { Restaurant, UserAddress } from '@/types/database';

const toRad = (value: number) => (value * Math.PI) / 180;

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
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

type TrafficLevel = 'light' | 'moderate' | 'heavy';
type WeatherSeverity = 'normal' | 'rain' | 'storm';

export function estimateTravelMinutes(
  restaurant: Pick<Restaurant, 'latitude' | 'longitude' | 'delivery_time'>,
  destination?: Pick<UserAddress, 'latitude' | 'longitude'>,
  opts?: { traffic?: TrafficLevel; weather?: WeatherSeverity }
) {
  const baseDelivery = typeof restaurant.delivery_time === 'string'
    ? parseInt(restaurant.delivery_time, 10)
    : Number(restaurant.delivery_time);

  let distanceKm = 3; // default short distance
  if (restaurant.latitude && restaurant.longitude && destination?.latitude && destination.longitude) {
    distanceKm = haversineDistanceKm(
      restaurant.latitude,
      restaurant.longitude,
      destination.latitude,
      destination.longitude
    );
  }

  const trafficFactor =
    opts?.traffic === 'heavy' ? 1.3 :
    opts?.traffic === 'moderate' ? 1.15 :
    1;

  const weatherFactor =
    opts?.weather === 'storm' ? 1.25 :
    opts?.weather === 'rain' ? 1.1 :
    1;

  const avgSpeedKmh = 25 / trafficFactor; // urban courier speed baseline
  const travelMinutesFromDistance = Math.max(8, Math.round((distanceKm / avgSpeedKmh) * 60 * weatherFactor));

  if (!Number.isNaN(baseDelivery) && baseDelivery > 0) {
    return Math.round(Math.max(travelMinutesFromDistance, baseDelivery * 0.4));
  }

  return travelMinutesFromDistance;
}
