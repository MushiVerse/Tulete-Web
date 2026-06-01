import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { BaseFirestoreService } from '../services/BaseFirestoreService';
import { BaseDocument, QueryParams } from '../services/types';

export function useFirestoreQuery<T extends BaseDocument>(
  queryKey: unknown[],
  service: BaseFirestoreService<T>,
  params?: QueryParams,
  options?: Omit<UseQueryOptions<{ data: T[], lastDoc: any }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey,
    queryFn: () => service.getMany(params),
    ...options,
  });
}

export function useFirestoreDocument<T extends BaseDocument>(
  queryKey: unknown[],
  service: BaseFirestoreService<T>,
  id: string,
  options?: Omit<UseQueryOptions<T | null, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKey, id],
    queryFn: () => service.getById(id),
    enabled: !!id,
    ...options,
  });
}
