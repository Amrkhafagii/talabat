import { supabase } from '../../supabase';

export type AdminSettingsPrefs = {
  push_enabled: boolean;
  email_enabled: boolean;
  data_sharing: boolean;
};

export async function getAdminSettings(): Promise<AdminSettingsPrefs | null> {
  const { data, error } = await supabase.rpc('get_admin_settings');
  if (error) {
    console.warn('get_admin_settings error', error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row as AdminSettingsPrefs;
}

export async function setAdminSettings(prefs: AdminSettingsPrefs): Promise<AdminSettingsPrefs | null> {
  const { data, error } = await supabase.rpc('set_admin_settings', {
    p_push_enabled: prefs.push_enabled,
    p_email_enabled: prefs.email_enabled,
    p_data_sharing: prefs.data_sharing,
  });
  if (error) {
    console.warn('set_admin_settings error', error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row as AdminSettingsPrefs;
}
