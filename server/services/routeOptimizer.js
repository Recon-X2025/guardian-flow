export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fetch driving distance and duration from Google Maps Distance Matrix API.
 * Falls back to haversine straight-line calculation when GOOGLE_MAPS_API_KEY is not set
 * or when the API call fails.
 *
 * @param {{ lat: number, lon: number }} origin
 * @param {{ lat: number, lon: number }} destination
 * @returns {Promise<{ distance_km: number, duration_minutes: number, source: string }>}
 */
export async function calculateDrivingTime(origin, destination) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
      url.searchParams.set('origins', `${origin.lat},${origin.lon}`);
      url.searchParams.set('destinations', `${destination.lat},${destination.lon}`);
      url.searchParams.set('mode', 'driving');
      url.searchParams.set('units', 'metric');
      url.searchParams.set('key', apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`Maps API HTTP ${response.status}`);

      const data = await response.json();
      const element = data?.rows?.[0]?.elements?.[0];

      if (element?.status === 'OK') {
        return {
          distance_km: +(element.distance.value / 1000).toFixed(2),
          duration_minutes: +Math.ceil(element.duration.value / 60).toFixed(0),
          source: 'google_maps',
        };
      }
      // Maps returned a non-OK element status (e.g. ZERO_RESULTS) — fall through
      console.warn('Google Maps element status:', element?.status);
    } catch (err) {
      console.warn('Google Maps Distance Matrix failed, using haversine fallback:', err.message);
    }
  }

  // Haversine fallback — assumes average driving speed of 50 km/h
  const dist = haversineDistance(origin.lat, origin.lon, destination.lat, destination.lon);
  return {
    distance_km: +dist.toFixed(2),
    duration_minutes: +Math.ceil(dist / 50 * 60).toFixed(0),
    source: 'haversine',
  };
}

/**
 * Optimise a list of stops using a nearest-neighbour TSP heuristic.
 * When GOOGLE_MAPS_API_KEY is set, real driving times are used as edge weights;
 * otherwise haversine straight-line distances are used.
 *
 * @param {Array<{ lat: number, lon: number, [key: string]: unknown }>} stops
 * @returns {Promise<typeof stops>}
 */
export async function optimizeRoute(stops) {
  if (!stops || stops.length === 0) return [];
  if (stops.length === 1) return stops;

  const unvisited = [...stops];
  const route = [unvisited.shift()];

  while (unvisited.length > 0) {
    const last = route[route.length - 1];
    let nearestIdx = 0;
    let nearestWeight = Infinity;

    // Evaluate candidates — use real driving time if Maps API is available
    for (let i = 0; i < unvisited.length; i++) {
      let weight;
      if (process.env.GOOGLE_MAPS_API_KEY) {
        try {
          const { duration_minutes } = await calculateDrivingTime(
            { lat: last.lat || 0, lon: last.lon || 0 },
            { lat: unvisited[i].lat || 0, lon: unvisited[i].lon || 0 },
          );
          weight = duration_minutes;
        } catch {
          weight = haversineDistance(last.lat || 0, last.lon || 0, unvisited[i].lat || 0, unvisited[i].lon || 0);
        }
      } else {
        weight = haversineDistance(last.lat || 0, last.lon || 0, unvisited[i].lat || 0, unvisited[i].lon || 0);
      }
      if (weight < nearestWeight) {
        nearestWeight = weight;
        nearestIdx = i;
      }
    }

    route.push(unvisited.splice(nearestIdx, 1)[0]);
  }

  return route;
}
