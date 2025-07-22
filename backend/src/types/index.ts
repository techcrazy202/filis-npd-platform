// backend/src/types/index.ts
// Shared type definitions

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  offset?: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  userTier: string;
  kycStatus: string;
  isActive: boolean;
}

export interface JWTPayload {
  userId: string;
  email: string;
  tokenType: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  quality?: number;
}

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  metadata?: ImageMetadata;
}

// API Error types
export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
}

// Request types
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// Environment types
export type NodeEnv = 'development' | 'production' | 'test';

// Database types
export type SortDirection = 'ASC' | 'DESC';

export interface QueryOptions {
  page?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: SortDirection;
  filters?: Record<string, any>;
}

export interface DatabaseResult<T> {
  data: T[];
  total: number;
  page?: number;
  limit?: number;
}

// Validation schemas
export interface ValidationSchema {
  [key: string]: any;
}

// Queue job types
export interface JobData {
  id: string;
  type: string;
  payload: any;
  createdAt: Date;
}

export interface ProcessingResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}