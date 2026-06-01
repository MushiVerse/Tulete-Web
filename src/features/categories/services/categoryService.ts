import { BaseFirestoreService } from '../../../core/services/BaseFirestoreService';
import { BaseDocument } from '../../../core/services/types';

export interface Category extends BaseDocument {
  // Define domain-specific fields here
}

class CategoryService extends BaseFirestoreService<Category> {
  constructor() {
    super('categories');
  }
}

export const categoryService = new CategoryService();
