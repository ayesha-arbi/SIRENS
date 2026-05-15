import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps'; // Requires config
import { GlassCard } from '../components/GlassCard';

const { height } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  // Mock Karachi Coordinates
  const initialRegion = {
    latitude: 24.8607,
    longitude: 67.0011,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <View className="flex-1 bg-[#07111F]">
      {/* Map Background */}
      <MapView 
        style={{ flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        initialRegion={initialRegion}
        userInterfaceStyle="dark"
        customMapStyle={[]} // Insert Google Maps Dark JSON here
      >
        {/* Flood Zone Blue Highlight */}
        <Polygon coordinates={[{lat: 24.87, lng: 67.01}, {lat: 24.88, lng: 67.02}, {lat: 24.86, lng: 67.03}]} fillColor="rgba(45, 156, 255, 0.3)" strokeColor="#2D9CFF" />
        
        {/* Crisis Hotspot Red */}
        <Marker coordinate={{ latitude: 24.865, longitude: 67.01 }}>
          <View className="w-8 h-8 bg-[#EB5757]/30 rounded-full items-center justify-center">
            <View className="w-4 h-4 bg-[#EB5757] rounded-full shadow-[0_0_10px_#EB5757]" />
          </View>
        </Marker>
      </MapView>

      {/* Top HUD */}
      <View className="pt-16 px-6">
        <GlassCard intensity={40} className="p-4 flex-row justify-between items-center">
          <View>
            <Text className="text-[#94A3B8] text-sm">Good Evening,</Text>
            <Text className="text-[#F8FAFC] font-bold text-xl">Abdullah</Text>
          </View>
          <View className="flex-row items-center bg-[#27AE60]/20 px-3 py-1.5 rounded-full border border-[#27AE60]/40">
            <View className="w-2 h-2 bg-[#27AE60] rounded-full mr-2" />
            <Text className="text-[#27AE60] text-xs font-bold">AI Active</Text>
          </View>
        </GlassCard>
      </View>

      {/* Floating Siren AI Button */}
      <TouchableOpacity className="absolute bottom-60 right-6 z-50">
        <LinearGradient colors={['#2D9CFF', '#56CCF2']} className="w-16 h-16 rounded-full items-center justify-center shadow-[0_0_20px_#56CCF2]">
          <Ionicons name="mic" size={28} color="#07111F" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Bottom Sheet Cards (Alerts) */}
      <View className="absolute bottom-24 w-full px-6">
        <Text className="text-[#F8FAFC] font-bold text-lg mb-3 shadow-lg">Active Alerts</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
          
          <GlassCard className="w-72 mr-4 border-[#EB5757]/50 bg-[#EB5757]/10">
            <View className="flex-row justify-between items-start mb-2">
              <View className="bg-[#EB5757]/20 px-2 py-1 rounded text-xs border border-[#EB5757]/40">
                <Text className="text-[#EB5757] text-xs font-bold">CRITICAL</Text>
              </View>
              <Text className="text-[#94A3B8] text-xs">2 min ago</Text>
            </View>
            <Text className="text-[#F8FAFC] font-bold text-lg mb-1">Urban Flooding</Text>
            <Text className="text-[#94A3B8] text-sm mb-3">DHA Phase 6. Avoid area. Emergency services dispatched.</Text>
            <TouchableOpacity className="bg-[#EB5757]/20 py-2 rounded-lg items-center">
              <Text className="text-[#EB5757] font-bold">Reroute Traffic</Text>
            </TouchableOpacity>
          </GlassCard>

          <GlassCard className="w-72 mr-4 border-[#F2C94C]/50 bg-[#F2C94C]/10">
             <View className="flex-row justify-between items-start mb-2">
              <View className="bg-[#F2C94C]/20 px-2 py-1 rounded text-xs border border-[#F2C94C]/40">
                <Text className="text-[#F2C94C] text-xs font-bold">WARNING</Text>
              </View>
              <Text className="text-[#94A3B8] text-xs">15 min ago</Text>
            </View>
            <Text className="text-[#F8FAFC] font-bold text-lg mb-1">Road Blockage</Text>
            <Text className="text-[#94A3B8] text-sm mb-3">Shahrah-e-Faisal traffic gridlocked due to accident.</Text>
            <TouchableOpacity className="bg-[#F2C94C]/20 py-2 rounded-lg items-center">
              <Text className="text-[#F2C94C] font-bold">View Alternate Route</Text>
            </TouchableOpacity>
          </GlassCard>

        </ScrollView>
      </View>

      {/* Custom Bottom Tab Bar */}
      <View className="absolute bottom-0 w-full bg-[#07111F]/90 border-t border-white/10 pb-8 pt-4 px-6 flex-row justify-between items-center">
        <TouchableOpacity className="items-center"><Ionicons name="home" size={24} color="#56CCF2" /><Text className="text-[#56CCF2] text-xs mt-1">Home</Text></TouchableOpacity>
        <TouchableOpacity className="items-center" onPress={() => navigation.navigate('Community')}><Ionicons name="people-outline" size={24} color="#94A3B8" /><Text className="text-[#94A3B8] text-xs mt-1">Community</Text></TouchableOpacity>
        <TouchableOpacity className="items-center"><Ionicons name="warning-outline" size={24} color="#94A3B8" /><Text className="text-[#94A3B8] text-xs mt-1">Alerts</Text></TouchableOpacity>
        <TouchableOpacity className="items-center"><Ionicons name="person-outline" size={24} color="#94A3B8" /><Text className="text-[#94A3B8] text-xs mt-1">Profile</Text></TouchableOpacity>
      </View>
    </View>
  );
}