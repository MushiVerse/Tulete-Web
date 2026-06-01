import { BaseFirestoreService } from '../../../core/services/BaseFirestoreService';
import { BaseDocument } from '../../../core/services/types';

export interface Cart extends BaseDocument {
  // Define domain-specific fields here
}

class CartService extends BaseFirestoreService<Cart> {
  constructor() {
    super('cart');
  }
}

export const cartService = new CartService();
