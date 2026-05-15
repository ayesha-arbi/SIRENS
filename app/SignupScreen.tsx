import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GlassCard } from '../components/GlassCard';

export default function SignupScreen({ navigation }: any) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    role: 'citizen',
    city: 'Karachi',
    district: '',
    preferences: { weather: true, traffic: true, crisis: true, highSeverityOnly: false },
  });

  const renderProgress = () => (
    <View className="flex-row space-x-2 mb-8 justify-center">
      {[1, 2, 3, 4].map(i => (
        <View key={i} className={`h-1.5 rounded-full flex-1 ${step >= i ? 'bg-[#56CCF2]' : 'bg-[#94A3B8]/30'}`} />
      ))}
    </View>
  );

  return (
    <View className="flex-1 bg-[#07111F] pt-16 px-6">
      {renderProgress()}
      
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {step === 1 && (
          <View>
            <Text className="text-3xl font-bold text-[#F8FAFC] mb-2">Basic Info</Text>
            <Text className="text-[#94A3B8] mb-8">Create your AI intelligence profile.</Text>
            <GlassCard>
              {['Full Name', 'Email', 'Password', 'Confirm Password'].map((field, idx) => (
                <View key={idx} className="mb-4">
                  <Text className="text-[#94A3B8] text-xs font-bold uppercase mb-2">{field}</Text>
                  <TextInput className="bg-[#07111F]/50 text-[#F8FAFC] p-4 rounded-xl border border-white/10" secureTextEntry={field.includes('Password')} />
                </View>
              ))}
            </GlassCard>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text className="text-3xl font-bold text-[#F8FAFC] mb-2">Select Role</Text>
            <Text className="text-[#94A3B8] mb-8">This determines your dashboard layout.</Text>
            {['citizen', 'official', 'field_agent'].map((role) => (
              <TouchableOpacity key={role} onPress={() => setFormData({ ...formData, role })}>
                <GlassCard className={`mb-4 ${formData.role === role ? 'border-[#56CCF2] bg-[#2D9CFF]/20' : ''}`}>
                  <View className="flex-row items-center">
                    <Ionicons name={role === 'citizen' ? 'person' : role === 'official' ? 'business' : 'car'} size={24} color={formData.role === role ? '#56CCF2' : '#94A3B8'} />
                    <View className="ml-4 flex-1">
                      <Text className="text-[#F8FAFC] font-bold capitalize text-lg">{role.replace('_', ' ')}</Text>
                      <Text className="text-[#94A3B8] text-sm">Access tailored tools for {role.replace('_', ' ')}s.</Text>
                    </View>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 3 && (
          <View>
            <Text className="text-3xl font-bold text-[#F8FAFC] mb-2">Location Setup</Text>
            <Text className="text-[#94A3B8] mb-8">Define your monitoring zones.</Text>
            <GlassCard className="mb-4">
              <Text className="text-[#94A3B8] text-xs font-bold uppercase mb-2">City</Text>
              <TextInput value={formData.city} className="bg-[#07111F]/50 text-[#F8FAFC] p-4 rounded-xl border border-white/10 mb-4" />
              <Text className="text-[#94A3B8] text-xs font-bold uppercase mb-2">Pin Home & Work on Map</Text>
              {/* Map Placeholder */}
              <View className="h-48 bg-[#1A2C42] rounded-xl border border-white/10 items-center justify-center overflow-hidden relative">
                <Ionicons name="map-outline" size={40} color="#2D9CFF" />
                <View className="absolute inset-0 bg-[#2D9CFF]/10" />
              </View>
            </GlassCard>
          </View>
        )}

        {step === 4 && (
          <View>
            <Text className="text-3xl font-bold text-[#F8FAFC] mb-2">Preferences</Text>
            <Text className="text-[#94A3B8] mb-8">Tune your AI alert sensitivity.</Text>
            <GlassCard>
              {Object.keys(formData.preferences).map((pref, idx) => (
                <View key={idx} className="flex-row justify-between items-center py-4 border-b border-white/10">
                  <Text className="text-[#F8FAFC] capitalize text-lg">{pref.replace(/([A-Z])/g, ' $1')}</Text>
                  <Switch 
                    value={(formData.preferences as any)[pref]} 
                    trackColor={{ false: '#1A2C42', true: '#56CCF2' }}
                    thumbColor="#fff"
                    onValueChange={(val) => setFormData({ ...formData, preferences: { ...formData.preferences, [pref]: val } })}
                  />
                </View>
              ))}
            </GlassCard>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity className="py-6" onPress={() => step < 4 ? setStep(step + 1) : navigation.navigate('Home')}>
        <LinearGradient colors={['#2D9CFF', '#56CCF2']} className="py-4 rounded-full items-center">
          <Text className="text-[#07111F] font-bold text-lg">{step === 4 ? 'Complete Setup' : 'Next Step'}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}