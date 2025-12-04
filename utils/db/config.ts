import { supabase } from '../supabase';

export interface TrustedRolloutConfig {
  observeOnly: boolean;
  substitutionsEnabledFor: string[];
  rerouteEnabledFor: string[];
  killSwitchOnTime?: number;
  killSwitchRerouteRate?: number;
  killSwitchCreditBudget?: number;
}

export async function getTrustedRolloutConfig(): Promise<TrustedRolloutConfig> {
  const { data, error } = await supabase
    .from('trusted_rollout_config')
    .select('config')
    .eq('key', 'trusted_arrival')
    .single();

  if (error || !data?.config) {
    return {
      observeOnly: true,
      substitutionsEnabledFor: [],
      rerouteEnabledFor: [],
    };
  }

  const cfg = data.config as any;
  return {
    observeOnly: cfg.observe_only ?? true,
    substitutionsEnabledFor: cfg.substitutions_enabled_for ?? [],
    rerouteEnabledFor: cfg.reroute_enabled_for ?? [],
    killSwitchOnTime: cfg.kill_switch_on_time,
    killSwitchRerouteRate: cfg.kill_switch_reroute_rate,
    killSwitchCreditBudget: cfg.kill_switch_credit_budget,
  };
}

export async function upsertTrustedRolloutConfig(config: TrustedRolloutConfig): Promise<boolean> {
  const payload = {
    observe_only: config.observeOnly,
    substitutions_enabled_for: config.substitutionsEnabledFor ?? [],
    reroute_enabled_for: config.rerouteEnabledFor ?? [],
    kill_switch_on_time: config.killSwitchOnTime ?? 85,
    kill_switch_reroute_rate: config.killSwitchRerouteRate ?? 20,
    kill_switch_credit_budget: config.killSwitchCreditBudget ?? 50,
  };

  const { error } = await supabase
    .from('trusted_rollout_config')
    .upsert({ key: 'trusted_arrival', config: payload }, { onConflict: 'key' });

  if (error) {
    console.error('Error upserting rollout config:', error);
    return false;
  }
  return true;
}
