import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { LinearGradient } from 'expo-linear-gradient';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const handleSubmit = async () => {
    if (!form.email || !form.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (!isLogin && !form.name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isLogin) {
        await login({ email: form.email, password: form.password });
      } else {
        await register({ email: form.email, password: form.password, name: form.name });
      }
    } catch (error: any) {
      const message = error?.response?.data?.message;
      Alert.alert(
        'Error',
        Array.isArray(message) ? message[0] : message || 'Authentication failed'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <LinearGradient
        colors={['#1a1a1a', '#050505']}
        className="absolute inset-0"
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          className="px-8">
          {/* Logo / Branding */}
          <View className="mb-12 items-center">
            <View className="mb-6 h-28 w-28 items-center justify-center rounded-[36px] bg-white/[0.03] shadow-2xl shadow-primary/20">
              <Image
                source={require('../assets/logo.png')}
                className="h-20 w-20"
                resizeMode="contain"
              />
            </View>
            <Text className="text-6xl font-black tracking-tighter text-white">One Melody</Text>
            <Text className="mt-4 text-center text-[16px] font-bold text-zinc-400">
              {isLogin
                ? 'Welcome back. Sign in to continue.'
                : 'Start your premium musical journey'}
            </Text>
          </View>

          {/* Form Card */}
          <View className="overflow-hidden rounded-[40px] border border-white/[0.08] bg-white/[0.03] p-8 shadow-2xl">
            {/* Name Field (Signup only) */}
            {!isLogin && (
              <View className="mb-5">
                <Text className="mb-2.5 ml-1 text-xs font-black uppercase tracking-[0.2em] text-zinc-600">
                  Full Name
                </Text>
                <View className="h-16 flex-row items-center rounded-2xl border border-white/[0.02] bg-surface-muted px-5">
                  <Ionicons name="person-outline" size={20} color="#52525b" />
                  <TextInput
                    className="ml-4 flex-1 text-[16px] font-bold text-white"
                    placeholder="Enter your name"
                    placeholderTextColor="#3f3f46"
                    value={form.name}
                    onChangeText={(t) => setForm({ ...form, name: t })}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            {/* Email Field */}
            <View className="mb-5">
              <Text className="mb-2.5 ml-1 text-xs font-black uppercase tracking-[0.2em] text-zinc-600">
                Email Address
              </Text>
              <View className="h-16 flex-row items-center rounded-2xl border border-white/[0.02] bg-surface-muted px-5">
                <Ionicons name="mail-outline" size={20} color="#52525b" />
                <TextInput
                  className="ml-4 flex-1 text-[16px] font-bold text-white"
                  placeholder="name@example.com"
                  placeholderTextColor="#3f3f46"
                  value={form.email}
                  onChangeText={(t) => setForm({ ...form, email: t })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Field */}
            <View className="mb-8">
              <Text className="mb-2.5 ml-1 text-xs font-black uppercase tracking-[0.2em] text-zinc-600">
                Secure Password
              </Text>
              <View className="h-16 flex-row items-center rounded-2xl border border-white/[0.02] bg-surface-muted px-5">
                <Ionicons name="lock-closed-outline" size={20} color="#52525b" />
                <TextInput
                  className="ml-4 flex-1 text-[16px] font-bold text-white"
                  placeholder="••••••••"
                  placeholderTextColor="#3f3f46"
                  value={form.password}
                  onChangeText={(t) => setForm({ ...form, password: t })}
                  secureTextEntry
                />
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="h-16 flex-row items-center justify-center rounded-[20px] bg-primary shadow-xl shadow-primary/20 transition-all active:scale-[0.98] active:bg-primary-dark">
              {isSubmitting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Text className="text-lg font-black tracking-tight text-black">
                    {isLogin ? 'Sign In' : 'Get Started'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#000" style={{ marginLeft: 8 }} />
                </>
              )}
            </Pressable>
          </View>

          {/* Toggle Login/Signup */}
          <View className="mt-8 flex-row items-center justify-center">
            <Text className="text-[15px] font-bold text-zinc-500">
              {isLogin ? "Don't have an account? " : 'Already a member? '}
            </Text>
            <Pressable onPress={() => setIsLogin(!isLogin)}>
              <Text className="text-[15px] font-black text-primary">
                {isLogin ? 'Join Now' : 'Sign In'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
