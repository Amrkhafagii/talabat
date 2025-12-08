import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { supabase } from '@/utils/supabase';
import { useAppTheme } from '@/styles/appTheme';

interface RealtimeIndicatorProps {
  show?: boolean;
}

export default function RealtimeIndicator({ show = true }: RealtimeIndicatorProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
        <Icon name="Wifi" size={12} color={theme.colors.status.success} />
      ) : (
        <Icon name="WifiOff" size={12} color={theme.colors.status.error} />
      )}
      <Text style={[styles.text, !isConnected && styles.disconnectedText]}>
        {isConnected ? 'Live' : 'Offline'}
      </Text>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.statusSoft.success,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xxs,
      borderRadius: theme.radius.pill,
      alignSelf: 'flex-start',
    },
    disconnected: {
      backgroundColor: theme.colors.statusSoft.error,
    },
    text: {
      fontSize: 10,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.status.success,
      marginLeft: theme.spacing.xxs,
    },
    disconnectedText: {
      color: theme.colors.status.error,
    },
  });
