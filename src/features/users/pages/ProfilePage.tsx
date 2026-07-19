import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useProfile, useUpdateProfile, useUploadProfileImage } from '../hooks/useProfile';
import { useAuthStore } from '../../../core/auth/useAuthStore';
import { PageContainer, ContentContainer } from '../../../shared/components/layout';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { formatPrice } from '../../../shared/utils/formatPrice';
import {
  User, Mail, Phone, MapPin, Edit2, Save, X,
  Shield, Star, Package, TrendingUp, CheckCircle,
  Heart, MessageSquare, LogOut, Camera, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { APP_SETTINGS } from '@/core/config/settings';

const profileSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  bio: z.string().max(200, 'Bio cannot exceed 200 characters').optional(),
  city: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const StatCard = ({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) => (
  <Card className={`p-4 border border-border bg-card shadow-sm text-center`}>
    <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mx-auto mb-2`}>
      {icon}
    </div>
    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
    <p className="text-lg font-extrabold text-slate-950 dark:text-white mt-0.5">{value}</p>
  </Card>
);

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { data: profile, isLoading, isError } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadImage = useUploadProfileImage();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  const bioValue = watch('bio') || '';

  // Initialize form when profile loads or editing starts
  useEffect(() => {
    if (profile && isEditing) {
      reset({
        displayName: profile.displayName || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        city: profile.city || '',
      });
    }
  }, [profile, isEditing, reset]);

  const onSubmit = (data: ProfileFormValues) => {
    updateProfile.mutate(data, {
      onSuccess: () => setIsEditing(false)
    });
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadImage.mutate({
      file,
      onProgress: (p) => setUploadProgress(p)
    }, {
      onSettled: () => {
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  if (isLoading) {
    return (
      <PageContainer>
        <ContentContainer size="md" className="space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-24 w-full rounded-xl" /></div>
        </ContentContainer>
      </PageContainer>
    );
  }

  if (isError || !profile) {
    return <div className="p-8 text-center text-rose-500">Failed to load profile.</div>;
  }

  return (
    <PageContainer>
      <ContentContainer size="md">
        {/* Profile Hero */}
      <Card className="relative overflow-hidden mb-6 border-0 shadow-lg">
        {/* Gradient banner */}
        <div className="h-28 bg-gradient-to-br from-primary/80 via-indigo-600 to-purple-700" />

        <div className="px-6 pb-6">
          {/* Avatar + Edit trigger */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative group cursor-pointer" onClick={handleImageClick}>
              <img
                src={profile.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.displayName)}
                alt={profile.displayName}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white dark:border-slate-900 shadow-xl bg-white"
              />
              <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-white shadow">
                <Camera className="w-3 h-3 text-white" />
              </button>
              
              {uploadImage.isPending && (
                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center backdrop-blur-sm border-4 border-white dark:border-slate-900">
                  <div className="text-white text-[10px] font-bold">{Math.round(uploadProgress)}%</div>
                </div>
              )}
              
              {/* Hidden file input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
                disabled={uploadImage.isPending}
              />
            </div>

            <div className="flex gap-2 mt-12">
              {isEditing ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="text-xs font-bold" disabled={updateProfile.isPending}>
                    <X className="w-3.5 h-3.5 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSubmit(onSubmit)} className="text-xs font-bold shadow-md" disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                    Save
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="text-xs font-bold">
                  <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Profile
                </Button>
              )}
            </div>
          </div>

          {/* Profile info */}
          {isEditing ? (
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Display Name</label>
                  <Input {...register('displayName')} className="text-xs" />
                  {errors.displayName && (
                    <p className="text-rose-500 text-[10px] mt-1">{errors.displayName.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Phone Number</label>
                  <Input {...register('phone')} className="text-xs" placeholder="+254 7XX XXX XXX" />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">City</label>
                  <Input {...register('city')} className="text-xs" placeholder="Nairobi" />
                </div>
              </div>
              <div>
                <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Bio <span className="normal-case font-normal">({bioValue.length}/200)</span></label>
                <textarea
                  {...register('bio')}
                  rows={3}
                  placeholder="Tell the community a bit about yourself..."
                  className="w-full text-xs bg-muted border border-border rounded-lg p-3 outline-none focus:ring-1 focus:ring-primary"
                />
                {errors.bio && <p className="text-rose-500 text-[10px] mt-1">{errors.bio.message}</p>}
              </div>
            </form>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-extrabold text-foreground">{profile.displayName}</h2>
                {profile.isVerified && (
                  <CheckCircle className="w-4 h-4 text-blue-500 fill-blue-500/20" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                <Mail className="w-3 h-3" /> {profile.email}
              </p>
              {profile.phone && (
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> {profile.phone}
                </p>
              )}
              {profile.city && (
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> {profile.city}{profile.country ? `, ${profile.country}` : ''}
                </p>
              )}
              {profile.bio && (
                <p className="text-xs text-muted-foreground leading-relaxed bg-muted rounded-xl p-3 border border-border">
                  {profile.bio}
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={<Package className="w-4 h-4 text-indigo-500" />}
          label="Total Orders"
          value={String(profile.totalOrders || 0)}
          color="bg-indigo-50 dark:bg-indigo-950/30"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
          label={`${APP_SETTINGS.currency} Spent`}
          value={formatPrice(profile.totalSpent || 0)}
          color="bg-emerald-50 dark:bg-emerald-950/30"
        />
        <StatCard
          icon={<Heart className="w-4 h-4 text-rose-500" />}
          label="Favorites"
          value="0"
          color="bg-rose-50 dark:bg-rose-950/30"
        />
        <StatCard
          icon={<Star className="w-4 h-4 text-amber-500" />}
          label="Reviews"
          value="0"
          color="bg-amber-50 dark:bg-amber-950/30"
        />
      </div>

      {/* Quick navigation actions */}
      <Card className="border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
        {[
          { label: 'My Orders', icon: <Package className="w-4 h-4 text-indigo-500" />, path: '/orders' },
          { label: 'Favorites & Wishlists', icon: <Heart className="w-4 h-4 text-rose-500" />, path: '/favorites' },
          { label: 'Messages', icon: <MessageSquare className="w-4 h-4 text-sky-500" />, path: '/messages' },
          { label: 'Reviews & Ratings', icon: <Star className="w-4 h-4 text-amber-500" />, path: '/reviews' },
          { label: 'Address Book', icon: <MapPin className="w-4 h-4 text-primary" />, path: '/location' },
          { label: 'Account Settings', icon: <Shield className="w-4 h-4 text-muted-foreground" />, path: '/settings' },
        ].map(({ label, icon, path }) => (
          <motion.button
            key={path}
            onClick={() => navigate(path)}
            whileHover={{ x: 4 }}
            className="w-full flex items-center justify-between px-5 py-4 text-xs font-bold text-left group"
          >
            <div className="flex items-center gap-3">
              {icon}
              <span className="text-foreground group-hover:text-primary transition-colors">{label}</span>
            </div>
            <span className="text-muted-foreground group-hover:text-primary transition-colors">›</span>
          </motion.button>
        ))}
      </Card>

      {/* Member since / logout */}
      <div className="mt-6 flex flex-col items-center gap-3">
        {profile.joinedAt && (
          <p className="text-[10px] text-muted-foreground font-medium">
            Member since {(() => {
              const dateObj = profile.joinedAt as any;
              const date = dateObj.seconds ? new Date(dateObj.seconds * 1000) : new Date(profile.joinedAt);
              return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
            })()}
          </p>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          className="text-rose-500 border-rose-200 hover:bg-rose-500 hover:text-white text-xs font-bold"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          Sign Out
        </Button>
      </div>
      </ContentContainer>
    </PageContainer>
  );
};
