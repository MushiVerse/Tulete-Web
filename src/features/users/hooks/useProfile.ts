import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService, UserProfile } from '../services/userService';
import { useAuthStore } from '../../../core/auth/useAuthStore';

export const useProfileKeys = {
  all: ['profile'] as const,
  detail: (email: string | null) => [...useProfileKeys.all, email] as const,
};

export const useProfile = () => {
  const { user } = useAuthStore();
  const email = user?.email || null;

  return useQuery({
    queryKey: useProfileKeys.detail(email),
    queryFn: () => {
      if (!email) throw new Error('No user logged in');
      return userService.getUserProfile(email);
    },
    enabled: !!email,
  });
};

export const useUpdateProfile = () => {
  const { user } = useAuthStore();
  const email = user?.email || null;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'uid'>>) => {
      if (!email) throw new Error('No user logged in');
      return userService.updateUserProfile(email, data);
    },
    onSuccess: () => {
      if (email) {
        queryClient.invalidateQueries({ queryKey: useProfileKeys.detail(email) });
      }
    },
  });
};

export const useUploadProfileImage = () => {
  const { user } = useAuthStore();
  const email = user?.email || null;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (p: number) => void }) => {
      if (!email) throw new Error('No user logged in');
      return userService.uploadProfileImage(email, file, onProgress);
    },
    onSuccess: () => {
      if (email) {
        queryClient.invalidateQueries({ queryKey: useProfileKeys.detail(email) });
      }
    },
  });
};
