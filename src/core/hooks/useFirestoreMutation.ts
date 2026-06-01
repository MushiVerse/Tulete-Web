import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { BaseFirestoreService } from '../services/BaseFirestoreService';
import { BaseDocument } from '../services/types';
import { toast } from 'sonner';

export function useFirestoreCreateMutation<T extends BaseDocument>(
  service: BaseFirestoreService<T>,
  invalidationKey: unknown[],
  options?: UseMutationOptions<T, Error, Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => service.create(data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: invalidationKey });
      if (options?.onSuccess) {
        (options.onSuccess as any)(...args);
      }
    },
    onError: (...args) => {
      const [error] = args;
      toast.error(error.message || 'Failed to create record.');
      if (options?.onError) {
        (options.onError as any)(...args);
      }
    },
    ...options,
  });
}

export function useFirestoreUpdateMutation<T extends BaseDocument>(
  service: BaseFirestoreService<T>,
  invalidationKey: unknown[],
  options?: UseMutationOptions<void, Error, { id: string; data: Partial<Omit<T, 'id' | 'createdAt'>> }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => service.update(id, data),
    onSuccess: (...args) => {
      const [, variables] = args;
      queryClient.invalidateQueries({ queryKey: invalidationKey });
      // Invalidate the specific document as well
      queryClient.invalidateQueries({ queryKey: [...invalidationKey, variables.id] });
      if (options?.onSuccess) {
        (options.onSuccess as any)(...args);
      }
    },
    onError: (...args) => {
      const [error] = args;
      toast.error(error.message || 'Failed to update record.');
      if (options?.onError) {
        (options.onError as any)(...args);
      }
    },
    ...options,
  });
}

export function useFirestoreDeleteMutation<T extends BaseDocument>(
  service: BaseFirestoreService<T>,
  invalidationKey: unknown[],
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => service.delete(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: invalidationKey });
      if (options?.onSuccess) {
        (options.onSuccess as any)(...args);
      }
    },
    onError: (...args) => {
      const [error] = args;
      toast.error(error.message || 'Failed to delete record.');
      if (options?.onError) {
        (options.onError as any)(...args);
      }
    },
    ...options,
  });
}
