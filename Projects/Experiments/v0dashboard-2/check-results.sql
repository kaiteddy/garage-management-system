-- Quick vehicle connection check
SELECT 
  COUNT(*) as total_vehicles,
  COUNT(customer_id) as connected_vehicles,
  ROUND((COUNT(customer_id)::decimal / COUNT(*)) * 100, 1) as connection_rate
FROM vehicles;

-- Sample connected vehicles
SELECT 
  v.registration,
  v.make,
  v.model,
  c.first_name,
  c.last_name
FROM vehicles v
JOIN customers c ON c.id = v.customer_id
WHERE v.customer_id IS NOT NULL
LIMIT 5;
