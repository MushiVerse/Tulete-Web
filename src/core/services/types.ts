export interface BaseDocument {
  id: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface PaginationParams {
  limit?: number;
  lastDoc?: any; // Firestore DocumentSnapshot
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface QueryFilter {
  field: string;
  operator: '<' | '<=' | '==' | '>=' | '>' | 'array-contains' | 'in' | 'array-contains-any' | 'not-in' | '!=';
  value: any;
}

export interface QueryParams extends PaginationParams {
  filters?: QueryFilter[];
}
