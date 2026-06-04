import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService, UserPreferences } from '../services/userService';
import { useAuthStore } from '../../../core/auth/useAuthStore';

export const useSettingsKeys = {
  all: ['settings'] as const,
  detail: (email: string | null) => [...useSettingsKeys.all, email] as const,
};

export const useSettings = () => {
  const { user } = useAuthStore();
  const email = user?.email || null;

  return useQuery({
    queryKey: useSettingsKeys.detail(email),
    queryFn: () => {
      if (!email) throw new Error('No user logged in');
      return userService.getUserPreferences(email);
    },
    enabled: !!email,
  });
};

export const useUpdateSettings = () => {
  const { user } = useAuthStore();
  const email = user?.email || null;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Omit<UserPreferences, 'id' | 'createdAt' | 'userId'>>) => {
      if (!email) throw new Error('No user logged in');
      return userService.updateUserPreferences(email, data);
    },
    onMutate: async (newData) => {
      if (!email) return;
      
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: useSettingsKeys.detail(email) });

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData<UserPreferences>(useSettingsKeys.detail(email));

      // Optimistically update to the new value
      if (previousSettings) {
        queryClient.setQueryData<UserPreferences>(useSettingsKeys.detail(email), {
          ...previousSettings,
          ...newData,
        });
      }

      // Return a context object with the snapshotted value
      return { previousSettings };
    },
    onError: (err, newData, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (email && context?.previousSettings) {
        queryClient.setQueryData(useSettingsKeys.detail(email), context.previousSettings);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure sync
      if (email) {
        queryClient.invalidateQueries({ queryKey: useSettingsKeys.detail(email) });
      }
    },
  });
};
