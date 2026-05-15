import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GlassCard } from '../components/GlassCard';

export default function LoginScreen({ navigation }: any) {
  return (
    <View className="flex-1 bg-[#07111F] justify-center px-6">
      <View className="mb-10">
        <Text className="text-4xl font-extrabold text-[#F8FAFC]">Welcome Back</Text>
        <Text className="text-[#94A3B8] text-base mt-2">Initialize secure session</Text>
      </View>

      <GlassCard className="mb-6">
        <View className="mb-4">
          <Text className="text-[#94A3B8] text-xs font-bold uppercase tracking-wider mb-2">Email Address</Text>
          <TextInput 
            className="w-full bg-[#07111F]/50 text-[#F8FAFC] p-4 rounded-xl border border-white/10"
            placeholder="agent@siren.ai"
            placeholderTextColor="#94A3B8"
          />
        </View>
        <View className="mb-2">
          <Text className="text-[#94A3B8] text-xs font-bold uppercase tracking-wider mb-2">Password</Text>
          <TextInput 
            className="w-full bg-[#07111F]/50 text-[#F8FAFC] p-4 rounded-xl border border-white/10"
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            secureTextEntry
          />
        </View>
        <TouchableOpacity className="items-end mt-2">
          <Text className="text-[#56CCF2] text-sm">Forgot Password?</Text>
        </TouchableOpacity>
      </GlassCard>

      <TouchableOpacity onPress={() => navigation.navigate('Home')}>
        <LinearGradient colors={['#2D9CFF', '#56CCF2']} className="py-4 rounded-full items-center mb-4 shadow-[0_0_15px_#2D9CFF]">
          <Text className="text-[#07111F] font-bold text-lg">Login</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity className="py-4 rounded-full items-center border border-white/20 bg-white/5 flex-row justify-center mb-8">
        <Ionicons name="logo-google" size={20} color="#F8FAFC" className="mr-3" />
        <Text className="text-[#F8FAFC] font-semibold text-lg ml-2">Continue with Google</Text>
      </TouchableOpacity>

      <View className="flex-row justify-center mt-4">
        <Text className="text-[#94A3B8]">Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text className="text-[#56CCF2] font-bold">Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}