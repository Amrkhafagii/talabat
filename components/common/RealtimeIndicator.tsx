import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Wifi, WifiOff } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';

interface RealtimeIndicatorProps {
  show?: boolean;
}

export default function RealtimeIndicator({ show = true }: RealtimeIndicatorProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (!show) return;

    // Monitor connection status
    const channel = supabase.channel('connection-status');
    
  channel
    .on('system', {}, (payload: any) => {
        if (payload.type === 'connected') {
          setIsConnected(true);
          setLastUpdate(new Date());
        } else if (payload.type === 'disconnected') {
          setIsConnected(false);
        }
      })
      .subscribe();

    // Heartbeat to update last seen
    const heartbeat = setInterval(() => {
      if (isConnected) {
        setLastUpdate(new Date());
      }
    }, 30000); // Update every 30 seconds

    return () => {
      supabase.removeChannel(channel);
      clearInterval(heartbeat);
    };
  }, [show, isConnected]);

  if (!show) return null;

  return (
    <View style={[styles.container, !isConnected && styles.disconnected]}>
      {isConnected ? (
        <Wifi size={12} color="#10B981" />
      ) : (
        <WifiOff size={12} color="#EF4444" />
      )}
      <Text style={[styles.text, !isConnected && styles.disconnectedText]}>
        {isConnected ? 'Live' : 'Offline'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  disconnected: {
    backgroundColor: '#FEE2E2',
  },
  text: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
    marginLeft: 4,
  },
  disconnectedText: {
    color: '#EF4444',
  },
});
