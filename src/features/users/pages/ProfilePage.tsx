import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { userService, UserProfile } from '../../users/services/userService';
import { PageWrapper } from '../../../shared/components/PageWrapper';
import { Card } from '../../../shared/components/ui/Card';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import {
  User, Mail, Phone, MapPin, Edit2, Save, X,
  Shield, Star, Package, TrendingUp, CheckCircle,
  Heart, MessageSquare, LogOut, Camera
} from 'lucide-react';
import { motion } from 'framer-motion';

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
  <Card className={`p-4 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-center`}>
    <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mx-auto mb-2`}>
      {icon}
    </div>
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
    <p className="text-lg font-extrabold text-slate-950 dark:text-white mt-0.5">{value}</p>
  </Card>
);

export const ProfilePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  const bioValue = watch('bio') || '';

  useEffect(() => {
    const mockProfile = userService.getMockProfile();
    setProfile(mockProfile);
    reset({
      displayName: mockProfile.displayName,
      phone: mockProfile.phone || '',
      bio: mockProfile.bio || '',
      city: mockProfile.city || '',
    });
  }, [reset]);

  const onSubmit = (data: ProfileFormValues) => {
    if (!profile) return;
    const updated = { ...profile, ...data };
    setProfile(updated);
    setIsEditing(false);
  };

  if (!profile) return null;

  return (
    <PageWrapper className="py-6 px-4 max-w-3xl mx-auto">
      {/* Profile Hero */}
      <Card className="relative overflow-hidden mb-6 border-0 shadow-lg">
        {/* Gradient banner */}
        <div className="h-28 bg-gradient-to-br from-primary/80 via-indigo-600 to-purple-700" />

        <div className="px-6 pb-6">
          {/* Avatar + Edit trigger */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative">
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white dark:border-slate-900 shadow-xl"
              />
              <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-white">
                <Camera className="w-3 h-3 text-white" />
              </button>
            </div>

            <div className="flex gap-2 mt-12">
              {isEditing ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="text-xs font-bold">
                    <X className="w-3.5 h-3.5 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSubmit(onSubmit)} className="text-xs font-bold shadow-md">
                    <Save className="w-3.5 h-3.5 mr-1" /> Save Profile
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
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 outline-none focus:ring-1 focus:ring-primary"
                />
                {errors.bio && <p className="text-rose-500 text-[10px] mt-1">{errors.bio.message}</p>}
              </div>
            </form>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{profile.displayName}</h2>
                {profile.isVerified && (
                  <CheckCircle className="w-4 h-4 text-blue-500 fill-blue-500/20" />
                )}
              </div>
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                <Mail className="w-3 h-3" /> {profile.email}
              </p>
              {profile.phone && (
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> {profile.phone}
                </p>
              )}
              {profile.city && (
                <p className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> {profile.city}, {profile.country}
                </p>
              )}
              {profile.bio && (
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
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
          value={String(profile.totalOrders)}
          color="bg-indigo-50 dark:bg-indigo-950/30"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
          label="KES Spent"
          value={profile.totalSpent.toLocaleString()}
          color="bg-emerald-50 dark:bg-emerald-950/30"
        />
        <StatCard
          icon={<Heart className="w-4 h-4 text-rose-500" />}
          label="Favorites"
          value="3"
          color="bg-rose-50 dark:bg-rose-950/30"
        />
        <StatCard
          icon={<Star className="w-4 h-4 text-amber-500" />}
          label="Reviews"
          value="5"
          color="bg-amber-50 dark:bg-amber-950/30"
        />
      </div>

      {/* Quick navigation actions */}
      <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden divide-y divide-slate-50 dark:divide-slate-800">
        {[
          { label: 'My Orders', icon: <Package className="w-4 h-4 text-indigo-500" />, path: '/orders' },
          { label: 'Favorites & Wishlists', icon: <Heart className="w-4 h-4 text-rose-500" />, path: '/favorites' },
          { label: 'Messages', icon: <MessageSquare className="w-4 h-4 text-sky-500" />, path: '/messages' },
          { label: 'Reviews & Ratings', icon: <Star className="w-4 h-4 text-amber-500" />, path: '/reviews' },
          { label: 'Address Book', icon: <MapPin className="w-4 h-4 text-primary" />, path: '/location' },
          { label: 'Account Settings', icon: <Shield className="w-4 h-4 text-slate-500" />, path: '/settings' },
        ].map(({ label, icon, path }) => (
          <motion.button
            key={path}
            onClick={() => navigate(path)}
            whileHover={{ x: 4 }}
            className="w-full flex items-center justify-between px-5 py-4 text-xs font-bold text-left group"
          >
            <div className="flex items-center gap-3">
              {icon}
              <span className="text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">{label}</span>
            </div>
            <span className="text-slate-400 group-hover:text-primary transition-colors">›</span>
          </motion.button>
        ))}
      </Card>

      {/* Member since / logout */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <p className="text-[10px] text-slate-400 font-medium">
          Member since {new Date(profile.joinedAt).toLocaleDateString([], { month: 'long', year: 'numeric' })}
        </p>
        <Button variant="outline" size="sm" className="text-rose-500 border-rose-200 hover:bg-rose-500 hover:text-white text-xs font-bold">
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          Sign Out
        </Button>
      </div>
    </PageWrapper>
  );
};
