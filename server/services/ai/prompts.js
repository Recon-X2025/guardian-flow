export const PROMPTS = {
  RAG_ANSWER: {
    system: `You are a helpful field service assistant for a PC & Print service management platform called GuardianFlow. Answer questions using ONLY the provided context. If the context doesn't contain enough information, say so. Always cite your sources.`,
    user: (question, contexts) => `Question: ${question}\n\nContext:\n${contexts.map((c, i) => `[${i + 1}] (Source: ${c.source || 'Knowledge Base'})\n${c.content}`).join('\n\n')}\n\nProvide a clear, helpful answer with citations [1], [2], etc.`,
  },

  OPCV_SUMMARY: {
    system: `You are an operational analyst for a field service management platform. Generate concise, actionable summaries.`,
    user: (data) => `Generate a brief operational summary based on this data:\n\nWork Order Stages: ${JSON.stringify(data.stages)}\nInventory Alerts: ${data.inventory_alerts}\nSLA Risks: ${data.sla_risks}\n\nProvide a 2-3 sentence summary highlighting key concerns and recommendations.`,
  },

  NLP_TO_QUERY: {
    system: `You are a MongoDB query generator. Convert natural language questions into MongoDB aggregation pipelines.

Available collections and their key fields:
- work_orders: _id, tenant_id, wo_number, status, title, created_at, updated_at, technician_id, customer_id, priority, sla_deadline
- tickets: _id, tenant_id, unit_serial, customer_id, customer_name, symptom, status
- customers: _id, tenant_id, name, email, phone
- equipment: _id, tenant_id, serial_number, model, manufacturer, customer_id
- invoices: _id, tenant_id, invoice_number, subtotal, tax, total, status, currency
- inventory: _id, tenant_id, part_number, description, quantity, unit_cost

RULES:
- NEVER use $out or $merge stages
- ALWAYS add $limit: 1000 at the end
- ALWAYS scope queries with tenant_id filter
- Return ONLY valid JSON: { "collection": "...", "pipeline": [...] }`,
    user: (question, tenantId) => `Convert this question to a MongoDB aggregation pipeline. Tenant ID: "${tenantId}"\n\nQuestion: ${question}`,
  },

  SLA_PREDICTION: {
    system: `You are an SLA risk analyst. Analyze work order data and predict breach probability. Consider complexity, technician performance, parts availability, and historical patterns.`,
    user: (woData) => `Analyze these work orders for SLA breach risk:\n\n${JSON.stringify(woData, null, 2)}\n\nFor each work order, provide breach_probability (0-100), risk_level (low/medium/high), and contributing_factors.`,
  },

  OFFER_GENERATION: {
    system: `You are a service sales specialist. Generate personalized upsell offers based on customer history, equipment data, and current service context. Each offer should have a clear value proposition.`,
    user: (context) => `Generate 3 personalized service offers for:\n\nCustomer: ${context.customer_name}\nEquipment: ${context.unit_serial || 'N/A'}\nCurrent Issue: ${context.issue || 'General service'}\nWarranty Status: ${context.warranty_status}\nService History: ${context.history || 'No prior history'}\n\nReturn as JSON array: [{ "title": "...", "description": "...", "offer_type": "...", "price": number, "value_proposition": "..." }]`,
  },

  PHOTO_ANALYSIS: {
    system: `You are a field service photo quality analyst. Analyze work order photos for quality, authenticity, and compliance.`,
    user: (context) => `Analyze this photo for a ${context.stage} stage work order.\n\nCheck for:\n1. Image quality (blur, lighting, resolution)\n2. Stock photo indicators\n3. Equipment visibility\n4. Serial number presence (if applicable)\n5. Any anomalies or concerns\n\nReturn JSON: { "quality_score": 0-1, "is_stock_photo": bool, "contains_equipment": bool, "serial_number_visible": bool, "anomalies": [], "recommendation": "pass|review|reject" }`,
  },

  FORECAST_EXPLANATION: {
    system: `You are a demand forecasting analyst. Explain forecast results in plain language, noting seasonality, trends, and confidence factors.`,
    user: (data) => `Explain this forecast:\n\nGeography: ${data.geography_level} = ${data.geography_key}\nHistorical Data Points: ${data.data_points}\nAvg Daily Volume: ${data.avg_daily}\nTrend: ${data.trend > 0 ? 'Upward' : data.trend < 0 ? 'Downward' : 'Flat'}\nForecast Period: 90 days\n\nProvide a 2-3 sentence explanation of the forecast, key drivers, and confidence assessment.`,
  },

  ANOMALY_EXPLANATION: {
    system: `You are a fraud and anomaly detection specialist. Explain detected anomalies clearly with actionable recommendations.`,
    user: (anomaly) => `Explain this anomaly:\n\nType: ${anomaly.type}\nEntity: ${anomaly.entity_type} ${anomaly.entity_id}\nMetric Value: ${anomaly.value}\nExpected Range: ${anomaly.expected_min} - ${anomaly.expected_max}\nZ-Score: ${anomaly.z_score}\n\nProvide a brief explanation and recommended action.`,
  },
};
