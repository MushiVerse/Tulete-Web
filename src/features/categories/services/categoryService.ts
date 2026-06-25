import { BaseFirestoreService } from '../../../core/services/BaseFirestoreService';
import { BaseDocument } from '../../../core/services/types';

export interface Category extends BaseDocument {
  name: string;
  imgURL?: string;
  image?: string;
  color?: string;
}

class CategoryService extends BaseFirestoreService<Category> {
  constructor() {
    super('Categories'); // Matches the uppercase C used in the Flutter app
  }
}

export const categoryService = new CategoryService();
