import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAdminGate } from '@/hooks/useAdminGate';
import { IOSCard } from '@/components/ios/IOSCard';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';
import { IOSToggleRow } from '@/components/ios/IOSToggleRow';
import { IOSListRow } from '@/components/ios/IOSListRow';
import { User, KeyRound, LogOut, Shield, Info, HelpCircle, FileText } from 'lucide-react-native';

export default function AdminSettings() {
  const { allowed, loading, signOut, user } = useAdminGate();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [dataSharing, setDataSharing] = useState(true);

  if (loading || !allowed) return null;

  return (
    <AdminShell title="Settings" onSignOut={signOut} headerVariant="ios">
      <View style={styles.stack}>
        <Section title="Account">
          <IOSListRow label="Profile" onPress={() => {}} icon={<User size={18} color={iosColors.primary} />} />
          <IOSListRow label="Change Password" onPress={() => {}} icon={<KeyRound size={18} color={iosColors.primary} />} />
          <IOSListRow label="Log Out" destructive onPress={signOut} icon={<LogOut size={18} color={iosColors.destructive} />} />
        </Section>

        <Section title="Notifications">
          <IOSToggleRow label="Push Notifications" value={pushEnabled} onValueChange={setPushEnabled} />
          <IOSToggleRow label="Email Alerts" value={emailEnabled} onValueChange={setEmailEnabled} />
        </Section>

        <Section title="Privacy & Security">
          <IOSToggleRow label="Data Sharing" value={dataSharing} onValueChange={setDataSharing} />
          <IOSListRow label="Privacy Policy" onPress={() => {}} icon={<Shield size={18} color={iosColors.primary} />} />
        </Section>

        <Section title="App Information">
          <IOSListRow label="Version" value="1.2.0 (Build 128)" icon={<Info size={18} color={iosColors.primary} />} />
          <IOSListRow label="Help & Support" onPress={() => {}} icon={<HelpCircle size={18} color={iosColors.primary} />} />
          <IOSListRow label="Terms of Service" onPress={() => {}} icon={<FileText size={18} color={iosColors.primary} />} />
        </Section>

        <Text style={styles.footer}>© 2023 Admin Console, Inc.</Text>
        <Text style={styles.footer}>{user?.email ?? ''}</Text>
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
