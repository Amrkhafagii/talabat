import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';

import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { useDeliveryLayout } from '@/styles/layout';
import { useAuth } from '@/contexts/AuthContext';
import { getDriverDeliveryHistory, submitDeliveryFeedback } from '@/utils/db/deliveries';
import { getDriverByUserId } from '@/utils/database';
import { supabase } from '@/utils/supabase';

const TAGS = ['friendly_customer', 'easy_pickup', 'long_wait', 'order_not_ready'];

export default function FeedbackScreen() {
  const theme = useRestaurantTheme();
  const { contentPadding } = useDeliveryLayout();
  const styles = useMemo(() => createStyles(theme, contentPadding.horizontal), [theme, contentPadding.horizontal]);
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(5);
  const [tags, setTags] = useState<string[]>(['friendly_customer', 'easy_pickup']);
  const [comment, setComment] = useState('');
  const [recentDelivery, setRecentDelivery] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const driver = await getDriverByUserId(user.id);
      setDriverId(driver?.id ?? null);
      if (!driver?.id) return;
      const deliveries = await getDriverDeliveryHistory(driver.id, 'week');
      setRecentDelivery(deliveries[0] || null);
      const { data } = await supabase
        .from('delivery_feedback')
        .select('*')
        .eq('driver_id', driver.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setHistory(data || []);
    };
    load();
  }, [user]);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const submit = async () => {
    if (!recentDelivery || !user || !driverId) {
      Alert.alert('No delivery selected', 'Complete a delivery first.');
      return;
    }
    setSubmitting(true);
    const ok = await submitDeliveryFeedback({
      order_id: recentDelivery.order_id,
      delivery_id: recentDelivery.id,
      driver_id: driverId,
      user_id: user.id,
      rating,
      tags,
      comment: comment.trim() || null,
    });
    if (ok) {
      Alert.alert('Thanks!', 'Feedback submitted.');
      setComment('');
    } else {
      Alert.alert('Error', 'Could not submit feedback.');
    }
    setSubmitting(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Rating & Feedback" showBackButton />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Text style={styles.title}>How was your delivery?</Text>
          <Text style={styles.subtitle}>
            {recentDelivery ? `Order #${recentDelivery.order_id?.slice(-6)}` : 'No recent delivery'}
          </Text>

          <Text style={styles.sectionTitle}>Rate the Customer</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity key={value} onPress={() => setRating(value)}>
                <Icon
                  name={value <= rating ? 'Star' : 'StarOutline'}
                  size={28}
                  color={value <= rating ? theme.colors.accent : theme.colors.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.tagsRow}>
            {TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tag, tags.includes(tag) && styles.tagActive]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[styles.tagText, tags.includes(tag) && styles.tagTextActive]}>
                  {tag.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.textArea}>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Share more details... (optional)"
              placeholderTextColor={theme.colors.textMuted}
              multiline
              style={styles.input}
            />
          </View>
          <Button title="Submit Feedback" onPress={submit} fullWidth pill disabled={submitting} />
        </Card>

        <Text style={styles.sectionTitle}>Your Recent Ratings</Text>
        <Card style={styles.card}>
          {history.length === 0 ? (
            <Text style={styles.subtitle}>No feedback yet.</Text>
          ) : (
            history.map((item) => (
              <View key={item.id} style={styles.feedbackRow}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Icon
                      name={value <= (item.rating || 0) ? 'Star' : 'StarOutline'}
                      key={value}
                      size={16}
                      color={value <= (item.rating || 0) ? theme.colors.accent : theme.colors.textMuted}
                    />
                  ))}
                </View>
                <Text style={styles.feedbackText}>{item.comment || 'No comment'}</Text>
                <Text style={styles.feedbackDate}>
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                </Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>, horizontal: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: horizontal, paddingBottom: theme.insets.bottom + theme.spacing.lg, gap: theme.spacing.md },
    card: { padding: theme.spacing.lg, gap: theme.spacing.md },
    title: { ...theme.typography.titleM, color: theme.colors.text },
    subtitle: { ...theme.typography.body, color: theme.colors.textMuted },
    sectionTitle: { ...theme.typography.subhead, color: theme.colors.text },
    stars: { flexDirection: 'row', gap: theme.spacing.xs },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    tag: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceAlt,
    },
    tagActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
    tagText: { ...theme.typography.caption, color: theme.colors.text },
    tagTextActive: { color: theme.colors.accent },
    textArea: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceAlt,
      minHeight: 120,
      padding: theme.spacing.md,
    },
    input: { ...theme.typography.body, color: theme.colors.text },
    feedbackRow: { gap: theme.spacing.xs, paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    feedbackText: { ...theme.typography.body, color: theme.colors.text },
    feedbackDate: { ...theme.typography.caption, color: theme.colors.textMuted },
    starsRow: { flexDirection: 'row', gap: 2 },
  });
