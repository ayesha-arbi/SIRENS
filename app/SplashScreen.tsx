import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';

export default function SplashScreen({ navigation }: any) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  }, []);

  const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 2.5] });
  const opacity = pulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 0.3, 0] });

  return (
    <View className="flex-1 bg-[#07111F] justify-center items-center relative">
      {/* Background Map Grid Mock */}
      <View className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#2D9CFF 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      {/* Radar Pulse */}
      <Animated.View style={{ transform: [{ scale }], opacity }} className="absolute w-64 h-64 rounded-full border border-[#56CCF2] bg-[#2D9CFF]/20" />
      <Animated.View style={{ transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.8] }) }], opacity }} className="absolute w-48 h-48 rounded-full border border-[#2D9CFF] bg-[#2D9CFF]/30" />

      {/* Center Logo */}
      <Animated.View style={{ opacity: fadeAnim }} className="items-center z-10">
        <View className="w-24 h-24 rounded-3xl bg-[#07111F] border border-[#56CCF2]/40 items-center justify-center shadow-[0_0_30px_#2D9CFF]">
          <Ionicons name="radio" size={48} color="#56CCF2" />
        </View>
        <Text className="text-4xl font-extrabold text-[#F8FAFC] tracking-widest mt-6">Siren<Text className="text-[#56CCF2]">AI</Text></Text>
        <Text className="text-[#94A3B8] text-sm tracking-widest mt-2 uppercase">Real-Time Crisis Intelligence</Text>
      </Animated.View>

      {/* Actions */}
      <Animated.View style={{ opacity: fadeAnim }} className="absolute bottom-16 w-full px-8">
        <TouchableOpacity onPress={() => navigation.navigate('Onboarding')}>
          <LinearGradient colors={['#2D9CFF', '#56CCF2']} className="py-4 rounded-full items-center mb-4">
            <Text className="text-[#07111F] font-bold text-lg">Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity className="py-4 rounded-full items-center border border-white/20 bg-white/5" onPress={() => navigation.navigate('Home')}>
          <Text className="text-[#F8FAFC] font-semibold text-lg">Continue as Guest</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}