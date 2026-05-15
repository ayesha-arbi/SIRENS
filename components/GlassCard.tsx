import { BlurView } from 'expo-blur';
import React from 'react';
import { View, ViewProps } from 'react-native';

interface GlassCardProps extends ViewProps {
  intensity?: number;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, intensity = 20, className = '', ...props }) => {
  return (
    <View className={`overflow-hidden rounded-3xl border border-white/10 ${className}`} {...props}>
      <BlurView intensity={intensity} tint="dark" className="absolute inset-0 bg-[#2D9CFF]/5" />
      <View className="p-5">{children}</View>
    </View>
  );
};