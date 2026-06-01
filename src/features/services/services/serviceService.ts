import { BaseFirestoreService } from '../../../core/services/BaseFirestoreService';
import { BaseDocument } from '../../../core/services/types';

export interface Service extends BaseDocument {
  // Define domain-specific fields here
}

class ServiceService extends BaseFirestoreService<Service> {
  constructor() {
    super('services');
  }
}

export const serviceService = new ServiceService();
