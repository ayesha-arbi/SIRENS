import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, FlatList, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Stay Ahead of Emergencies',
    description: 'Multi-agent AI continuously monitors your city for danger signals.',
    icon: 'analytics-outline',
  },
  {
    id: '2',
    title: 'Community Powered Alerts',
    description: 'Receive verified community reports and live crisis updates.',
    icon: 'earth-outline',
  },
  {
    id: '3',
    title: 'Coordinated Response',
    description: 'AI-driven coordination helps reduce chaos and save time.',
    icon: 'shield-checkmark-outline',
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <View className="flex-1 bg-[#07111F]">
      <FlatList
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ width }} className="flex-1 justify-center items-center px-8">
            <View className="w-64 h-64 rounded-full bg-[#2D9CFF]/10 items-center justify-center border border-[#56CCF2]/20 mb-12">
              <Ionicons name={item.icon as any} size={100} color="#56CCF2" />
            </View>
            <Text className="text-3xl font-bold text-[#F8FAFC] text-center mb-4">{item.title}</Text>
            <Text className="text-[#94A3B8] text-center text-base leading-relaxed">{item.description}</Text>
          </View>
        )}
      />

      {/* Pagination & Controls */}
      <View className="absolute bottom-12 w-full px-8 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text className="text-[#94A3B8] font-semibold text-lg">Skip</Text>
        </TouchableOpacity>

        <View className="flex-row space-x-2">
          {slides.map((_, index) => (
            <View key={index} className={`h-2 rounded-full ${currentIndex === index ? 'w-8 bg-[#56CCF2]' : 'w-2 bg-[#94A3B8]/30'}`} />
          ))}
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} className="bg-[#2D9CFF]/20 px-6 py-3 rounded-full border border-[#56CCF2]/30">
          <Text className="text-[#56CCF2] font-bold text-lg">{currentIndex === 2 ? 'Done' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}