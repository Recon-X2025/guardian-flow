-- Update HVAC test data to PC & Printer issues
UPDATE public.tickets
SET symptom = 'Printer not printing, paper jam error'
WHERE symptom = 'Unit not cooling, high pressure alarm';

UPDATE public.tickets
SET symptom = 'Computer won''t boot, blue screen error'
WHERE symptom = 'Low airflow, thermostat unresponsive';

UPDATE public.tickets
SET symptom = 'Intermittent shutdown, overheating warning'
WHERE symptom = 'Intermittent power failure, fan motor noise';