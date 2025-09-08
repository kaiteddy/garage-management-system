-- Fix Customer-Vehicle Relationship Issues
-- This script standardizes on using owner_id and cleans up inconsistent data

-- Step 1: Show current state
SELECT 
  'Current State' as step,
  COUNT(*) as total_vehicles,
  COUNT(owner_id) as vehicles_with_owner_id,
  COUNT(customer_id) as vehicles_with_customer_id,
  COUNT(CASE WHEN owner_id IS NOT NULL AND customer_id IS NOT NULL THEN 1 END) as vehicles_with_both,
  COUNT(CASE WHEN owner_id IS NULL AND customer_id IS NULL THEN 1 END) as vehicles_with_neither
FROM vehicles;

-- Step 2: Copy customer_id to owner_id where owner_id is null but customer_id exists
UPDATE vehicles 
SET owner_id = customer_id, updated_at = NOW()
WHERE owner_id IS NULL AND customer_id IS NOT NULL;

-- Step 3: Clear customer_id field to avoid confusion (we'll use owner_id as the single source of truth)
UPDATE vehicles 
SET customer_id = NULL, updated_at = NOW()
WHERE customer_id IS NOT NULL;

-- Step 4: Show final state
SELECT 
  'After Cleanup' as step,
  COUNT(*) as total_vehicles,
  COUNT(owner_id) as vehicles_with_owner_id,
  COUNT(customer_id) as vehicles_with_customer_id,
  COUNT(CASE WHEN owner_id IS NOT NULL AND customer_id IS NOT NULL THEN 1 END) as vehicles_with_both,
  COUNT(CASE WHEN owner_id IS NULL AND customer_id IS NULL THEN 1 END) as vehicles_with_neither
FROM vehicles;

-- Step 5: Show sample of cleaned data
SELECT 
  v.registration,
  v.make,
  v.model,
  v.owner_id,
  v.customer_id,
  c.first_name || ' ' || c.last_name as owner_name
FROM vehicles v
LEFT JOIN customers c ON v.owner_id = c.id
ORDER BY v.registration
LIMIT 10;
