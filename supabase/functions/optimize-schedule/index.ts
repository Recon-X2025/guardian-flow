import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { date, technicians, workOrders } = await req.json();

    // Constraint-based scheduling algorithm
    // 1. Priority-based sorting
    const sortedOrders = [...workOrders].sort((a, b) => {
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    });

    const assignments: any[] = [];
    const techSchedules = new Map();

    // Initialize technician schedules
    technicians.forEach((tech: any) => {
      techSchedules.set(tech.id, {
        workHours: 0,
        travelTime: 0,
        lastLocation: tech.location,
        assignments: []
      });
    });

    // 2. Skill matching and assignment
    for (const wo of sortedOrders) {
      let bestMatch = null;
      let minTravelTime = Infinity;

      for (const tech of technicians) {
        if (tech.availability !== "available") continue;

        // Skill matching
        const hasRequiredSkills = wo.requiredSkills.length === 0 || 
          wo.requiredSkills.every((skill: string) => tech.skills.includes(skill));

        if (!hasRequiredSkills) continue;

        // Calculate travel time (simplified Euclidean distance)
        const schedule = techSchedules.get(tech.id);
        const travelTime = calculateTravelTime(schedule.lastLocation, wo.location);

        // Check capacity (8 hour workday)
        if (schedule.workHours + wo.estimatedHours + travelTime / 60 > 8) continue;

        if (travelTime < minTravelTime) {
          minTravelTime = travelTime;
          bestMatch = tech;
        }
      }

      if (bestMatch) {
        const schedule = techSchedules.get(bestMatch.id);
        const travelMinutes = minTravelTime;
        const startHour = 8 + schedule.workHours + schedule.travelTime / 60;
        
        const scheduledTime = new Date(date);
        scheduledTime.setHours(Math.floor(startHour));
        scheduledTime.setMinutes((startHour % 1) * 60);

        assignments.push({
          workOrderId: wo.id,
          technicianId: bestMatch.id,
          scheduledTime: scheduledTime.toISOString(),
          travelTime: travelMinutes
        });

        schedule.workHours += wo.estimatedHours;
        schedule.travelTime += travelMinutes;
        schedule.lastLocation = wo.location;
        schedule.assignments.push(wo.id);
      }
    }

    // 3. Calculate optimization metrics
    let totalTravelTime = 0;
    let totalWorkHours = 0;

    techSchedules.forEach((schedule) => {
      totalTravelTime += schedule.travelTime / 60;
      totalWorkHours += schedule.workHours;
    });

    const utilizationRate = (totalWorkHours / (technicians.length * 8)) * 100;

    const optimization = {
      totalTravelTime,
      totalWorkHours,
      utilizationRate,
      assignments
    };

    console.log(`Schedule optimized: ${assignments.length} assignments, ${utilizationRate.toFixed(1)}% utilization`);

    return new Response(
      JSON.stringify(optimization),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Schedule optimization error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function calculateTravelTime(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  // Simplified travel time calculation (Haversine distance + average speed)
  const R = 6371; // Earth radius in km
  const dLat = (to.lat - from.lat) * Math.PI / 180;
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  // Assume average speed of 50 km/h, return minutes
  return (distance / 50) * 60;
}
