import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAdminGate } from '@/hooks/useAdminGate';
import { IOSCard } from '@/components/ios/IOSCard';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';
import { IOSToggleRow } from '@/components/ios/IOSToggleRow';
import { IOSListRow } from '@/components/ios/IOSListRow';
import { User, KeyRound, LogOut, Shield, Info, HelpCircle, FileText } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { getAdminSettings, setAdminSettings, AdminSettingsPrefs } from '@/utils/db/adminOps';

type SettingsPrefs = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  dataSharing: boolean;
};

const STORAGE_KEY = 'admin_settings_prefs';

export default function AdminSettings() {
  const { allowed, loading, signOut, user } = useAdminGate();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [dataSharing, setDataSharing] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPrefs = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SettingsPrefs;
        setPushEnabled(parsed.pushEnabled);
        setEmailEnabled(parsed.emailEnabled);
        setDataSharing(parsed.dataSharing);
      }
      const remote = await getAdminSettings();
      const metaPrefs = (user?.user_metadata?.admin_settings as SettingsPrefs | undefined) ?? null;
      const prefs = remote
        ? { pushEnabled: remote.push_enabled, emailEnabled: remote.email_enabled, dataSharing: remote.data_sharing }
        : metaPrefs
          ? metaPrefs
          : null;
      if (prefs) {
        setPushEnabled(prefs.pushEnabled ?? prefs.push_enabled ?? true);
        setEmailEnabled(prefs.emailEnabled ?? prefs.email_enabled ?? true);
        setDataSharing(prefs.dataSharing ?? prefs.data_sharing ?? true);
      }
    } catch (err) {
      console.warn('loadPrefs error', err);
    }
  }, [user?.user_metadata]);

  const persistPrefs = useCallback(
    async (prefs: SettingsPrefs) => {
      setSaving(true);
      try {
        const payload: AdminSettingsPrefs = {
          push_enabled: prefs.pushEnabled,
          email_enabled: prefs.emailEnabled,
          data_sharing: prefs.dataSharing,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
        await setAdminSettings(payload);
        await supabase.auth.updateUser({ data: { admin_settings: prefs } });
      } catch (err) {
        console.warn('persistPrefs error', err);
      } finally {
        setSaving(false);
      }
    },
    []
  );

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const handleChange = useCallback(
    (next: Partial<SettingsPrefs>) => {
      const prefs: SettingsPrefs = {
        pushEnabled,
        emailEnabled,
        dataSharing,
        ...next,
      };
      setPushEnabled(prefs.pushEnabled);
      setEmailEnabled(prefs.emailEnabled);
      setDataSharing(prefs.dataSharing);
      persistPrefs(prefs);
    },
    [pushEnabled, emailEnabled, dataSharing, persistPrefs]
  );

  if (loading || !allowed) return null;

  return (
    <AdminShell
      title="Settings"
      onSignOut={signOut}
      headerVariant="ios"
      headerDoneAction={{ label: 'Done', onPress: () => router.back() }}
    >
      <View style={styles.stack}>
        <Section title="Account">
          <IOSListRow label="Profile" onPress={() => {}} icon={<User size={18} color={iosColors.primary} />} />
          <IOSListRow label="Change Password" onPress={() => {}} icon={<KeyRound size={18} color={iosColors.primary} />} />
          <IOSListRow label="Log Out" destructive onPress={signOut} icon={<LogOut size={18} color={iosColors.destructive} />} />
        </Section>

        <Section title="Notifications">
          <IOSToggleRow label="Push Notifications" value={pushEnabled} onValueChange={(v) => handleChange({ pushEnabled: v })} />
          <IOSToggleRow label="Email Alerts" value={emailEnabled} onValueChange={(v) => handleChange({ emailEnabled: v })} />
        </Section>

        <Section title="Privacy & Security">
          <IOSToggleRow label="Data Sharing" value={dataSharing} onValueChange={(v) => handleChange({ dataSharing: v })} />
          <IOSListRow label="Privacy Policy" onPress={() => {}} icon={<Shield size={18} color={iosColors.primary} />} />
        </Section>

        <Section title="App Information">
          <IOSListRow label="Version" value="1.2.0 (Build 128)" icon={<Info size={18} color={iosColors.primary} />} />
          <IOSListRow label="Help & Support" onPress={() => {}} icon={<HelpCircle size={18} color={iosColors.primary} />} />
          <IOSListRow label="Terms of Service" onPress={() => {}} icon={<FileText size={18} color={iosColors.primary} />} />
        </Section>

        <Text style={styles.footer}>© 2023 Admin Console, Inc.</Text>
        <Text style={styles.footer}>{saving ? 'Saving preferences…' : user?.email ?? ''}</Text>
      </View>
    </AdminShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title.toUpperCase()}</Text>
      <IOSCard padding="sm" style={styles.card}>
        <View style={{ gap: 12 }}>{children}</View>
      </IOSCard>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: iosSpacing.lg },
  section: { gap: iosSpacing.xs },
  sectionLabel: { ...iosTypography.caption, color: iosColors.secondaryText, marginLeft: iosSpacing.md },
  card: { gap: iosSpacing.xs },
  footer: { ...iosTypography.caption, textAlign: 'center', color: iosColors.tertiaryText },
});
