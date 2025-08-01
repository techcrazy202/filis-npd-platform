import { BaseRepository, PaginationOptions } from './BaseRepository';
export interface Product {
    id: string;
    name: string;
    product_id?: string;
    brand: string;
    description?: string;
    industry?: string;
    sector?: string;
    sub_sector?: string;
    segment?: string;
    sub_segment?: string;
    category?: string;
    continents?: string;
    country?: string;
    geo?: string;
    country_of_origin?: string;
    availability_regions?: any;
    is_regional_exclusive: boolean;
    barcode?: string;
    product_code?: string;
    sku?: string;
    ingredients_list?: string;
    standardized_ingredients?: any;
    nutritional_info?: any;
    calories?: string;
    claims?: string;
    flavour?: string;
    allergen_info?: any;
    dietary_preferences?: any;
    price?: string;
    volume_scale?: string;
    volume_subscale?: string;
    currency: string;
    mrp?: number;
    pack_size?: string;
    company_name?: string;
    standardized_company_name?: string;
    manufacturer?: string;
    distributor?: string;
    retailer?: string;
    product_link?: string;
    source_name?: string;
    website_address?: string;
    manufacture_date?: Date;
    expiry_date?: Date;
    year?: string;
    date_of_entry?: Date;
    remarks?: string;
    verification_status: 'pending' | 'verified' | 'rejected' | 'flagged';
    ai_confidence_score: number;
    submission_count: number;
    last_verified_at?: Date;
    first_discovered_by?: string;
    discovery_date?: Date;
    is_npd: boolean;
    regional_popularity_score: number;
    created_at: Date;
    updated_at: Date;
}
export interface SearchFilters {
    query?: string;
    category?: string[];
    brand?: string[];
    country?: string[];
    countryOfOrigin?: string[];
    priceRange?: [number, number];
    isRegional?: boolean;
    verificationStatus?: string[];
    dateRange?: [Date, Date];
    isNpd?: boolean;
}
export declare class ProductRepository extends BaseRepository<Product> {
    constructor();
    search(searchFilters: SearchFilters, pagination?: PaginationOptions): Promise<{
        data: Product[];
        total: number;
    }>;
    getAutocompleteSuggestions(query: string, field?: 'name' | 'brand' | 'category'): Promise<string[]>;
    getFilterFacets(): Promise<{
        categories: Array<{
            value: string;
            count: number;
        }>;
        brands: Array<{
            value: string;
            count: number;
        }>;
        countries: Array<{
            value: string;
            count: number;
        }>;
    }>;
    findSimilarProducts(name: string, brand: string, threshold?: number): Promise<Product[]>;
    findByBarcode(barcode: string): Promise<Product | null>;
    updateVerificationStatus(productId: string, status: Product['verification_status'], confidenceScore?: number): Promise<Product>;
    getProductsByDiscoverer(userId: string): Promise<Product[]>;
    getRecentNPDProducts(limit?: number): Promise<Product[]>;
}
export { User, CreateUserData, UpdateUserData } from './UserRepository';
//# sourceMappingURL=ProductRepository.d.ts.map