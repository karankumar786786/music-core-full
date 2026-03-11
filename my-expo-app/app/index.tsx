import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          className="px-6">
          {/* Logo / Branding */}
          <View className="mb-10 items-center">
            <View className="mb-5 h-20 w-20 items-center justify-center rounded-3xl bg-green-500/20">
              <Ionicons name="musical-notes" size={40} color="#22c55e" />
            </View>
            <Text className="text-4xl font-black tracking-tighter text-white">One Melody</Text>
            <Text className="mt-2 text-base font-medium text-zinc-500">
              {isLogin ? 'Sign in to your account' : 'Create your musical journey'}
            </Text>
          </View>

          {/* Form Card */}
          <View className="rounded-3xl border border-white/5 bg-zinc-900/60 p-6">
            {/* Name Field (Signup only) */}
            {!isLogin && (
              <View className="mb-4">
                <Text className="mb-2 ml-1 text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Name
                </Text>
                <View className="h-14 flex-row items-center rounded-2xl border border-white/5 bg-zinc-800/80 px-4">
                  <Ionicons name="person-outline" size={18} color="#71717a" />
                  <TextInput
                    className="ml-3 flex-1 text-base text-white"
                    placeholder="Your name"
                    placeholderTextColor="#52525b"
                    value={form.name}
                    onChangeText={(t) => setForm({ ...form, name: t })}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            {/* Email Field */}
            <View className="mb-4">
              <Text className="mb-2 ml-1 text-xs font-bold uppercase tracking-widest text-zinc-500">
                Email
              </Text>
              <View className="h-14 flex-row items-center rounded-2xl border border-white/5 bg-zinc-800/80 px-4">
                <Ionicons name="mail-outline" size={18} color="#71717a" />
                <TextInput
                  className="ml-3 flex-1 text-base text-white"
                  placeholder="name@example.com"
                  placeholderTextColor="#52525b"
                  value={form.email}
                  onChangeText={(t) => setForm({ ...form, email: t })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Field */}
            <View className="mb-6">
              <Text className="mb-2 ml-1 text-xs font-bold uppercase tracking-widest text-zinc-500">
                Password
              </Text>
              <View className="h-14 flex-row items-center rounded-2xl border border-white/5 bg-zinc-800/80 px-4">
                <Ionicons name="lock-closed-outline" size={18} color="#71717a" />
                <TextInput
                  className="ml-3 flex-1 text-base text-white"
                  placeholder="••••••••"
                  placeholderTextColor="#52525b"
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
              className="h-14 flex-row items-center justify-center rounded-2xl bg-green-500 active:opacity-80">
              {isSubmitting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons
                    name={isLogin ? 'log-in-outline' : 'person-add-outline'}
                    size={20}
                    color="#000"
                  />
                  <Text className="ml-2 text-lg font-bold text-black">
                    {isLogin ? 'Sign In' : 'Sign Up'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Toggle Login/Signup */}
          <View className="mt-6 flex-row items-center justify-center">
            <Text className="text-sm text-zinc-500">
              {isLogin ? 'New to One Melody? ' : 'Already have an account? '}
            </Text>
            <Pressable onPress={() => setIsLogin(!isLogin)}>
              <Text className="text-sm font-bold text-green-500">
                {isLogin ? 'Create an account' : 'Sign In'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
