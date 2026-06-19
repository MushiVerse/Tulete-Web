import { BaseFirestoreService } from '../../../core/services/BaseFirestoreService';
import { BaseDocument } from '../../../core/services/types';

export interface Brand extends BaseDocument {
  name: string;
  image: string;
  category: string; // e.g., 'Food Brands', 'Product Brands', 'product', 'food'
  subCat?: string;
}

export class BrandService extends BaseFirestoreService<Brand> {
  constructor() {
    super('brands');
  }
}

export const brandService = new BrandService();
