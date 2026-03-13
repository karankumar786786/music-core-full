import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { musicApi } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { getCoverImageUrl } from '../../lib/s3';

export default function Profile() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '' });
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const {
    data: user,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['me'],
    queryFn: () => musicApi.getProfile(),
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, []);

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => musicApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      Alert.alert('Success', 'Profile updated');
      setIsEditing(false);
    },
    onError: () => Alert.alert('Error', 'Failed to update profile'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: any) => musicApi.changePassword(data),
    onSuccess: () => {
      Alert.alert('Success', 'Password changed');
      setIsChangingPassword(false);
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to change password');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (uri: string) => {
      const fileName = uri.split('/').pop() || 'profile.jpg';
      const ext = fileName.split('.').pop()?.toLowerCase() || 'jpeg';
      const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      const { uploadUrl, key } = await musicApi.getProfilePictureUploadUrl(fileName, contentType);
      const response = await fetch(uri);
      const blob = await response.blob();
      await axios.put(uploadUrl, blob, {
        headers: { 'Content-Type': contentType },
      });
      return musicApi.updateProfile({ profilePictureKey: key });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      Alert.alert('Success', 'Profile picture updated');
    },
    onError: () => Alert.alert('Error', 'Failed to upload profile picture'),
  });

  const pickImage = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Permission needed', 'Please grant access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      uploadMutation.mutate(result.assets[0].uri);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (!passwordData.oldPassword || !passwordData.newPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    changePasswordMutation.mutate({
      oldPassword: passwordData.oldPassword,
      newPassword: passwordData.newPassword,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#22c55e" size="large" />
      </SafeAreaView>
    );
  }

  const userInitial = user?.name?.[0]?.toUpperCase() || '?';
  const avatarUrl =
    user?.profilePictureUrl || getCoverImageUrl(user?.profilePictureKey, 'large') || null;

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />
        }>
        {/* ── Profile Header ── */}
        <View className="items-center px-4 pb-6 pt-8">
          {/* Avatar */}
          <Pressable
            onPress={pickImage}
            disabled={uploadMutation.isPending}
            className="relative mb-4 h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border-2 border-primary/30 bg-primary/10">
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <Text className="text-5xl font-black text-primary">{userInitial}</Text>
            )}
            <View className="absolute -bottom-0 -right-0 h-9 w-9 items-center justify-center rounded-tl-2xl bg-primary">
              {uploadMutation.isPending ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Ionicons name="camera" size={16} color="#000" />
              )}
            </View>
          </Pressable>

          <Text className="text-2xl font-black tracking-tight text-white">{user?.name}</Text>
          <View className="mt-1 flex-row items-center">
            <Ionicons name="mail-outline" size={14} color="#71717a" />
            <Text className="ml-1 text-sm font-medium text-zinc-500">{user?.email}</Text>
          </View>

          <View className="mt-4 flex-row gap-3">
            {!isEditing && (
              <Pressable
                onPress={() => {
                  setIsEditing(true);
                  setFormData({ name: user?.name || '' });
                }}
                className="h-11 flex-row items-center rounded-xl bg-primary px-6 active:opacity-80">
                <Ionicons name="pencil" size={16} color="#000" />
                <Text className="ml-2 font-bold text-black">Edit Profile</Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleLogout}
              className="h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 active:bg-red-500/10">
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            </Pressable>
          </View>
        </View>

        {/* ── Edit Name Section ── */}
        {isEditing && (
          <View className="mx-4 mb-6 rounded-3xl border border-white/5 bg-zinc-900/60 p-5">
            <Text className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
              Display Name
            </Text>
            <View className="flex-row items-center gap-2">
              <View className="h-12 flex-1 flex-row items-center rounded-xl border border-white/10 bg-zinc-800 px-4">
                <TextInput
                  className="flex-1 text-base text-white"
                  value={formData.name}
                  onChangeText={(t) => setFormData({ name: t })}
                  placeholder="Your name"
                  placeholderTextColor="#52525b"
                />
              </View>
              <Pressable
                onPress={() => updateProfileMutation.mutate({ name: formData.name })}
                disabled={updateProfileMutation.isPending}
                className="h-12 w-12 items-center justify-center rounded-xl bg-primary active:opacity-80">
                {updateProfileMutation.isPending ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Ionicons name="checkmark" size={22} color="#000" />
                )}
              </Pressable>
              <Pressable
                onPress={() => setIsEditing(false)}
                className="h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-zinc-800">
                <Ionicons name="close" size={22} color="#a1a1aa" />
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Account Details ── */}
        <View className="mx-4 mb-6 rounded-3xl border border-white/5 bg-zinc-900/60 p-5">
          <Text className="mb-4 text-base font-bold text-white">Account Details</Text>

          <View className="mb-4">
            <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-600">
              Display Name
            </Text>
            <View className="flex-row items-center rounded-xl border border-white/5 bg-zinc-800/60 px-4 py-3">
              <Ionicons name="person-outline" size={16} color="#52525b" />
              <Text className="ml-3 font-medium text-white">{user?.name}</Text>
            </View>
          </View>

          <View>
            <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-600">
              Email Address
            </Text>
            <View className="flex-row items-center rounded-xl border border-white/5 bg-zinc-800/60 px-4 py-3 opacity-50">
              <Ionicons name="mail-outline" size={16} color="#52525b" />
              <Text className="ml-3 font-medium text-white">{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* ── Account Insights ── */}
        <View className="mx-4 mb-6 rounded-3xl border border-white/5 bg-zinc-900/60 p-5">
          <Text className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
            Account Insights
          </Text>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-zinc-400">Status</Text>
            <Text className="text-sm font-bold text-primary">Active</Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-zinc-400">Joined</Text>
            <Text className="text-sm font-bold text-white">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </Text>
          </View>
        </View>

        {/* ── Security Card ── */}
        <Pressable
          onPress={() => setIsChangingPassword(true)}
          className="mx-4 mb-6 flex-row items-center justify-between rounded-3xl border border-white/5 bg-zinc-900/60 p-5 active:bg-white/5">
          <View className="flex-1 flex-row items-center">
            <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
            <View className="ml-3 flex-1">
              <Text className="font-bold text-white">Security & Privacy</Text>
              <Text className="mt-0.5 text-sm font-medium text-zinc-500">Change your password</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#52525b" />
        </Pressable>

        {/* ── History Card ── */}
        <Pressable
          onPress={() => router.push('/history')}
          className="mx-4 mb-6 flex-row items-center justify-between rounded-3xl border border-white/5 bg-zinc-900/60 p-5 active:bg-white/5">
          <View className="flex-1 flex-row items-center">
            <Ionicons name="time" size={20} color="#22c55e" />
            <View className="ml-3 flex-1">
              <Text className="font-bold text-white">History</Text>
              <Text className="mt-0.5 text-sm font-medium text-zinc-500">
                View your listening history
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#52525b" />
        </Pressable>

        {/* ── Change Password Modal ── */}
        <Modal visible={isChangingPassword} animationType="slide" transparent>
          <View className="flex-1 justify-end bg-black/60">
            <View className="rounded-t-[32px] border-t border-white/10 bg-zinc-950 px-6 pb-12 pt-8">
              <Text className="mb-2 text-center text-2xl font-black tracking-tight text-white">
                Change Password
              </Text>
              <Text className="mb-8 text-center text-sm text-zinc-500">
                Verify your identity to update password
              </Text>

              {/* Current Password */}
              <View className="mb-4">
                <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-600">
                  Current Password
                </Text>
                <View className="h-12 flex-row items-center rounded-xl border border-white/10 bg-zinc-900 px-4">
                  <TextInput
                    className="flex-1 text-base text-white"
                    secureTextEntry={!showOldPw}
                    value={passwordData.oldPassword}
                    onChangeText={(t) => setPasswordData({ ...passwordData, oldPassword: t })}
                    placeholder="••••••••"
                    placeholderTextColor="#52525b"
                  />
                  <Pressable onPress={() => setShowOldPw(!showOldPw)}>
                    <Ionicons
                      name={showOldPw ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#71717a"
                    />
                  </Pressable>
                </View>
              </View>

              {/* New Password */}
              <View className="mb-4">
                <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-600">
                  New Password
                </Text>
                <View className="h-12 flex-row items-center rounded-xl border border-white/10 bg-zinc-900 px-4">
                  <TextInput
                    className="flex-1 text-base text-white"
                    secureTextEntry={!showNewPw}
                    value={passwordData.newPassword}
                    onChangeText={(t) => setPasswordData({ ...passwordData, newPassword: t })}
                    placeholder="••••••••"
                    placeholderTextColor="#52525b"
                  />
                  <Pressable onPress={() => setShowNewPw(!showNewPw)}>
                    <Ionicons
                      name={showNewPw ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#71717a"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password */}
              <View className="mb-6">
                <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-600">
                  Confirm New Password
                </Text>
                <View className="h-12 flex-row items-center rounded-xl border border-white/10 bg-zinc-900 px-4">
                  <TextInput
                    className="flex-1 text-base text-white"
                    secureTextEntry
                    value={passwordData.confirmPassword}
                    onChangeText={(t) => setPasswordData({ ...passwordData, confirmPassword: t })}
                    placeholder="••••••••"
                    placeholderTextColor="#52525b"
                  />
                </View>
              </View>

              {/* Buttons */}
              <Pressable
                onPress={handlePasswordChange}
                disabled={changePasswordMutation.isPending}
                className="mb-3 h-14 items-center justify-center rounded-2xl bg-primary active:opacity-80">
                {changePasswordMutation.isPending ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text className="text-lg font-bold text-black">Update Password</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  setIsChangingPassword(false);
                  setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="h-12 items-center justify-center rounded-2xl">
                <Text className="font-medium text-zinc-500">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}
