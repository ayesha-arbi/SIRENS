import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GlassCard } from '../components/GlassCard';

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState('Feed');

  return (
    <View className="flex-1 bg-[#07111F] pt-16 px-6">
      <Text className="text-3xl font-extrabold text-[#F8FAFC] mb-6">Community Hub</Text>
      
      {/* Tabs */}
      <View className="flex-row bg-[#1A2C42] rounded-full p-1 mb-6">
        {['Feed', 'Report Incident'].map(tab => (
          <TouchableOpacity 
            key={tab} 
            className={`flex-1 py-3 rounded-full items-center ${activeTab === tab ? 'bg-[#2D9CFF]' : ''}`}
            onPress={() => setActiveTab(tab)}
          >
            <Text className={`font-bold ${activeTab === tab ? 'text-[#07111F]' : 'text-[#94A3B8]'}`}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {activeTab === 'Feed' ? (
          <>
            {/* Feed Item 1 */}
            <GlassCard className="mb-4">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 rounded-full bg-[#F2C94C] items-center justify-center mr-3">
                  <Text className="font-bold text-[#07111F]">SZ</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[#F8FAFC] font-bold">Sarah Zaman</Text>
                  <Text className="text-[#94A3B8] text-xs">Clifton • 5 mins ago</Text>
                </View>
                <View className="bg-[#EB5757]/20 px-2 py-1 rounded border border-[#EB5757]/40">
                  <Text className="text-[#EB5757] text-xs font-bold">FIRE</Text>
                </View>
              </View>
              <Text className="text-[#F8FAFC] text-sm mb-3">Massive smoke coming out from a commercial building on 26th Street. Fire trucks just arrived.</Text>
              {/* Mock Image via colored View for placeholder */}
              <View className="w-full h-40 bg-[#1A2C42] rounded-xl border border-white/10 items-center justify-center mb-3">
                <Ionicons name="image-outline" size={40} color="#94A3B8" />
              </View>
              <View className="flex-row justify-between pt-3 border-t border-white/10">
                <TouchableOpacity className="flex-row items-center"><Ionicons name="arrow-up-circle-outline" size={20} color="#27AE60" /><Text className="text-[#27AE60] ml-1">42 Verify</Text></TouchableOpacity>
                <TouchableOpacity className="flex-row items-center"><Ionicons name="chatbubble-outline" size={20} color="#94A3B8" /><Text className="text-[#94A3B8] ml-1">8 Comments</Text></TouchableOpacity>
                <TouchableOpacity className="flex-row items-center"><Ionicons name="share-social-outline" size={20} color="#94A3B8" /><Text className="text-[#94A3B8] ml-1">Share</Text></TouchableOpacity>
              </View>
            </GlassCard>

            {/* Feed Item 2 */}
            <GlassCard className="mb-4">
               {/* Simplified second card */}
               <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 rounded-full bg-[#2D9CFF] items-center justify-center mr-3">
                  <Text className="font-bold text-[#07111F]">AH</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[#F8FAFC] font-bold">Ali Hassan</Text>
                  <Text className="text-[#94A3B8] text-xs">Gulshan • 12 mins ago</Text>
                </View>
                <View className="bg-[#2D9CFF]/20 px-2 py-1 rounded border border-[#2D9CFF]/40">
                  <Text className="text-[#2D9CFF] text-xs font-bold">FLOOD</Text>
                </View>
              </View>
              <Text className="text-[#F8FAFC] text-sm">Road entirely submerged. Cars are stuck. Do not take University Road.</Text>
            </GlassCard>
          </>
        ) : (
          <View>
            <GlassCard className="mb-4">
              <Text className="text-[#94A3B8] text-xs font-bold uppercase mb-3">Select Category</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {['Flood', 'Accident', 'Fire', 'Road Blockage', 'Power Outage'].map((cat, i) => (
                  <TouchableOpacity key={cat} className={`px-4 py-2 rounded-full border ${i === 0 ? 'bg-[#56CCF2]/20 border-[#56CCF2]' : 'border-white/20'}`}>
                    <Text className={i === 0 ? 'text-[#56CCF2] font-bold' : 'text-[#94A3B8]'}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-[#94A3B8] text-xs font-bold uppercase mb-2">Description</Text>
              <TextInput 
                multiline 
                numberOfLines={4} 
                className="bg-[#07111F]/50 text-[#F8FAFC] p-4 rounded-xl border border-white/10 mb-4 h-32 text-left align-top"
                placeholder="What's happening?"
                placeholderTextColor="#94A3B8"
              />

              <TouchableOpacity className="w-full h-16 bg-[#07111F]/50 border border-dashed border-[#2D9CFF] rounded-xl flex-row items-center justify-center mb-6">
                <Ionicons name="camera-outline" size={24} color="#2D9CFF" />
                <Text className="text-[#2D9CFF] font-bold ml-2">Attach Photo/Video</Text>
              </TouchableOpacity>

              <LinearGradient colors={['#2D9CFF', '#56CCF2']} className="py-4 rounded-xl items-center shadow-[0_0_15px_#2D9CFF]">
                <Text className="text-[#07111F] font-bold text-lg">Broadcast to AI System</Text>
              </LinearGradient>
            </GlassCard>
          </View>
        )}
      </ScrollView>
    </View>
  );
}