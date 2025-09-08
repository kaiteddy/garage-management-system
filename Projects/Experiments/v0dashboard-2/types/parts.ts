// Parts Database Types

export interface Part {
  id: string;
  part_number: string;
  oem_part_number?: string;
  description: string;
  category?: string;
  subcategory?: string;
  
  // Pricing information
  cost_net: number;
  price_retail_net: number;
  price_trade_net: number;
  margin_percentage?: number;
  
  // Stock information
  quantity_in_stock: number;
  minimum_stock_level: number;
  location?: string;
  bin_location?: string;
  
  // Supplier information
  supplier_id?: string;
  supplier_name?: string;
  supplier_part_number?: string;
  manufacturer?: string;
  brand?: string;
  
  // Vehicle compatibility
  vehicle_makes?: string[];
  vehicle_models?: string[];
  year_from?: number;
  year_to?: number;
  engine_codes?: string[];
  
  // Part specifications
  weight_kg?: number;
  dimensions_length_mm?: number;
  dimensions_width_mm?: number;
  dimensions_height_mm?: number;
  warranty_months?: number;
  
  // PartSouq integration
  partsouq_id?: string;
  partsouq_url?: string;
  partsouq_last_updated?: Date;
  partsouq_price?: number;
  partsouq_availability?: string;
  
  // Additional metadata
  notes?: string;
  tags?: string[];
  is_active: boolean;
  is_hazardous: boolean;
  requires_core_exchange: boolean;
  
  // Audit fields
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
}

export interface PartSupplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  payment_terms?: string;
  delivery_days?: number;
  minimum_order_value?: number;
  discount_percentage?: number;
  is_active: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PartPricingHistory {
  id: string;
  part_id: string;
  supplier_id?: string;
  price_type: 'cost' | 'retail' | 'trade';
  old_price: number;
  new_price: number;
  change_reason?: string;
  effective_date: Date;
  created_at: Date;
  created_by?: string;
}

export interface PartVehicleCompatibility {
  id: string;
  part_id: string;
  make: string;
  model: string;
  variant?: string;
  year_from?: number;
  year_to?: number;
  engine_code?: string;
  engine_size?: string;
  fuel_type?: string;
  transmission?: string;
  body_style?: string;
  notes?: string;
  created_at: Date;
}

export interface PartUsageHistory {
  id: string;
  part_id: string;
  document_id?: string;
  vehicle_id?: string;
  quantity_used: number;
  unit_price: number;
  total_price: number;
  usage_date: Date;
  usage_type: 'sale' | 'warranty' | 'internal';
  notes?: string;
  created_at: Date;
}

export interface PartSouqApiUsage {
  id: string;
  request_type: 'search' | 'details' | 'pricing';
  search_query?: string;
  part_number?: string;
  vehicle_registration?: string;
  results_count?: number;
  api_cost: number;
  response_time_ms?: number;
  success: boolean;
  error_message?: string;
  created_at: Date;
}

// Search and filter interfaces
export interface PartSearchFilters {
  search?: string; // Search in part_number, description, oem_part_number
  category?: string;
  subcategory?: string;
  manufacturer?: string;
  brand?: string;
  supplier_id?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  engine_code?: string;
  year_from?: number;
  year_to?: number;
  in_stock_only?: boolean;
  is_active?: boolean;
  tags?: string[];
  price_min?: number;
  price_max?: number;
  sort_by?: 'part_number' | 'description' | 'price_retail_net' | 'quantity_in_stock' | 'created_at';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PartSearchResult {
  parts: Part[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// PartSouq integration interfaces
export interface PartSouqSearchRequest {
  query?: string;
  part_number?: string;
  vehicle_registration?: string;
  make?: string;
  model?: string;
  year?: number;
}

export interface PartSouqSearchResult {
  id: string;
  part_number: string;
  description: string;
  manufacturer?: string;
  price?: number;
  availability?: string;
  image_url?: string;
  details_url?: string;
  vehicle_compatibility?: {
    make: string;
    model: string;
    year_from?: number;
    year_to?: number;
    engine_codes?: string[];
  }[];
}

export interface PartSouqResponse {
  success: boolean;
  results: PartSouqSearchResult[];
  total_count: number;
  api_cost: number;
  response_time_ms: number;
  error?: string;
}

// Import/Export interfaces
export interface PartImportData {
  part_number: string;
  oem_part_number?: string;
  description: string;
  category?: string;
  subcategory?: string;
  cost_net?: number;
  price_retail_net?: number;
  price_trade_net?: number;
  quantity_in_stock?: number;
  minimum_stock_level?: number;
  location?: string;
  supplier_name?: string;
  manufacturer?: string;
  brand?: string;
  vehicle_makes?: string;
  vehicle_models?: string;
  year_from?: number;
  year_to?: number;
  engine_codes?: string;
  weight_kg?: number;
  warranty_months?: number;
  notes?: string;
  tags?: string;
}

export interface PartImportResult {
  success: boolean;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  errors: {
    row: number;
    part_number: string;
    error: string;
  }[];
}

// Analytics interfaces
export interface PartAnalytics {
  total_parts: number;
  active_parts: number;
  total_value: number;
  low_stock_count: number;
  top_categories: {
    category: string;
    count: number;
    value: number;
  }[];
  top_suppliers: {
    supplier: string;
    part_count: number;
    total_value: number;
  }[];
  recent_usage: PartUsageHistory[];
  pricing_trends: {
    part_id: string;
    part_number: string;
    price_changes: PartPricingHistory[];
  }[];
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type PartApiResponse<T = any> = ApiResponse<T>;
