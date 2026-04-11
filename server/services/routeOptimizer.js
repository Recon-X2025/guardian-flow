export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function calculateDrivingTime(origin, destination) {
  const dist = haversineDistance(origin.lat, origin.lon, destination.lat, destination.lon);
  return { distance_km: +dist.toFixed(2), duration_minutes: +(dist / 50 * 60).toFixed(0) };
}

export async function optimizeRoute(stops) {
  if (!stops || stops.length === 0) return [];
  const unvisited = [...stops];
  const route = [unvisited.shift()];
  while (unvisited.length > 0) {
    const last = route[route.length - 1];
    let nearestIdx = 0, nearestDist = Infinity;
    unvisited.forEach((s, i) => {
      const d = haversineDistance(last.lat || 0, last.lon || 0, s.lat || 0, s.lon || 0);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    });
    route.push(unvisited.splice(nearestIdx, 1)[0]);
  }
  return route;
}
