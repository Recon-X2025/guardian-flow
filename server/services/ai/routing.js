import { findMany } from '../../db/query.js';

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestNeighborTSP(stops) {
  if (stops.length <= 1) return stops;

  const visited = new Set();
  const route = [stops[0]];
  visited.add(0);

  while (visited.size < stops.length) {
    const current = route[route.length - 1];
    let nearest = null;
    let nearestDist = Infinity;

    for (let i = 0; i < stops.length; i++) {
      if (visited.has(i)) continue;
      const dist = haversineDistance(
        current.lat, current.lon,
        stops[i].lat, stops[i].lon
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    }

    if (nearest !== null) {
      visited.add(nearest);
      route.push(stops[nearest]);
    }
  }

  return route;
}

export async function optimizeRoutes(technicianIds, date) {
  const results = [];

  for (const techId of technicianIds) {
    // Get work orders assigned to this technician
    const workOrders = await findMany('work_orders', {
      technician_id: techId,
      status: { $in: ['released', 'assigned', 'in_progress'] },
    }, { sort: { created_at: 1 } });

    if (workOrders.length === 0) {
      results.push({ technician_id: techId, stops: [], total_distance_km: 0, estimated_duration_hours: 0 });
      continue;
    }

    // Get GPS coords from check-ins or generate approximate ones
    const stops = [];
    for (const wo of workOrders) {
      let lat = wo.check_in_latitude || wo.lat;
      let lon = wo.check_in_longitude || wo.lon;

      // If no GPS, try to get from ticket
      if (!lat || !lon) {
        try {
          const ticket = wo.ticket_id ? await (await import('../../db/query.js')).findOne('tickets', { _id: wo.ticket_id }) : null;
          lat = ticket?.lat || ticket?.check_in_latitude;
          lon = ticket?.lon || ticket?.check_in_longitude;
        } catch (e) { /* skip */ }
      }

      // If still no coords, use a deterministic pseudo-location based on ID hash
      if (!lat || !lon) {
        let hash = 0;
        const id = wo._id || '';
        for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
        lat = 28.6 + (hash & 0xFF) / 256 * 2; // ~Delhi area spread
        lon = 77.2 + ((hash >> 8) & 0xFF) / 256 * 2;
      }

      stops.push({
        work_order_id: wo._id,
        wo_number: wo.wo_number,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        status: wo.status,
        priority: wo.priority,
        title: wo.title,
      });
    }

    // Run nearest-neighbor TSP
    const optimized = nearestNeighborTSP(stops);

    // Calculate distances between consecutive stops
    let totalDistance = 0;
    const routeStops = optimized.map((stop, idx) => {
      let distFromPrev = 0;
      if (idx > 0) {
        distFromPrev = haversineDistance(
          optimized[idx - 1].lat, optimized[idx - 1].lon,
          stop.lat, stop.lon
        );
        totalDistance += distFromPrev;
      }
      return {
        ...stop,
        sequence: idx + 1,
        distance_from_prev_km: Math.round(distFromPrev * 10) / 10,
        cumulative_distance_km: Math.round(totalDistance * 10) / 10,
      };
    });

    // Estimate duration: travel at 40km/h + 1.5h per stop
    const travelHours = totalDistance / 40;
    const serviceHours = routeStops.length * 1.5;
    const totalHours = travelHours + serviceHours;

    results.push({
      technician_id: techId,
      stops: routeStops,
      total_distance_km: Math.round(totalDistance * 10) / 10,
      travel_time_hours: Math.round(travelHours * 10) / 10,
      service_time_hours: serviceHours,
      estimated_duration_hours: Math.round(totalHours * 10) / 10,
      stop_count: routeStops.length,
      optimized_at: new Date().toISOString(),
    });
  }

  return results;
}

export function geocodeAddress(address) {
  // Mock geocoding - in production, use Nominatim or similar
  let hash = 0;
  for (let i = 0; i < (address || '').length; i++) {
    hash = ((hash << 5) - hash + address.charCodeAt(i)) | 0;
  }
  return {
    lat: 28.6 + (hash & 0xFF) / 256 * 4,
    lon: 77.2 + ((hash >> 8) & 0xFF) / 256 * 4,
    source: 'mock',
  };
}
