import { supabase } from '../supabase';
import { BackupRestaurant, DeliveryEvent, Restaurant, RestaurantSla } from '@/types/database';

type WeatherSeverity = 'normal' | 'rain' | 'storm';
type EtaComputationInput = {
  prepP50Minutes: number;
  prepP90Minutes: number;
  bufferMinutes?: number;
  travelMinutes: number;
  weatherSeverity?: WeatherSeverity;
  reliabilityScore?: number;
  dataFresh?: boolean;
};

export type EtaComputation = {
  etaMinutes: number;
  etaLowMinutes: number;
  etaHighMinutes: number;
  trusted: boolean;
  weatherFactor: number;
  bandWidthMinutes: number;
  bandTooWide: boolean;
  dataStale: boolean;
};

type NewDeliveryEvent = Omit<DeliveryEvent, 'id' | 'created_at'> & { payload?: Record<string, any>; idempotencyKey?: string };

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type QueuedTask = {
  fn: () => Promise<boolean>;
  attempts: number;
  maxAttempts: number;
};

const writeQueue: QueuedTask[] = [];
let processingQueue = false;

async function processQueue() {
  if (processingQueue) return;
  processingQueue = true;
  while (writeQueue.length > 0) {
    const task = writeQueue.shift()!;
    try {
      const ok = await task.fn();
      if (!ok) throw new Error('Task returned false');
    } catch (err) {
      task.attempts += 1;
      if (task.attempts < task.maxAttempts) {
        const delay = Math.min(500 * 2 ** task.attempts, 8000);
        await wait(delay);
        writeQueue.unshift(task);
      } else {
        console.error('Persist task failed after retries:', err);
      }
    }
  }
  processingQueue = false;
}

function enqueueWrite(fn: () => Promise<boolean>, maxAttempts = 6) {
  writeQueue.push({ fn, attempts: 0, maxAttempts });
  processQueue();
}

export async function getRestaurantSla(restaurantId: string): Promise<RestaurantSla | null> {
  const { data, error } = await supabase
    .from('restaurant_sla')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching restaurant SLA:', error);
    return null;
  }

  if (!data) {
    return {
      restaurant_id: restaurantId,
      prep_p50_minutes: 12,
      prep_p90_minutes: 20,
      buffer_minutes: 5,
      reliability_score: 0.9,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;
  }

  return data;
}

export async function listBackupRestaurants(restaurantId: string): Promise<BackupRestaurant[]> {
  const { data, error } = await supabase
    .from('backup_restaurants')
    .select(`
      *,
      backup_restaurant:backup_restaurant_id(*)
    `)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (error) {
    console.error('Error fetching backup restaurants:', error);
    return [];
  }

  return (data || []) as BackupRestaurant[];
}

export async function getBackupCandidates(restaurantId: string): Promise<(BackupRestaurant & { backup_restaurant: Restaurant })[]> {
  const { data, error } = await supabase
    .from('backup_restaurants')
    .select(`
      *,
      backup_restaurant:backup_restaurant_id(*)
    `)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (error) {
    console.error('Error fetching backup candidates:', error);
    return [];
  }

  return ((data || []) as any[]).filter(d => d.backup_restaurant?.is_open);
}

export async function createDeliveryEvent(event: NewDeliveryEvent): Promise<boolean> {
  const run = async () => {
    if (event.idempotencyKey && event.order_id) {
      const { data: existing } = await supabase
        .from('delivery_events')
        .select('id')
        .eq('order_id', event.order_id)
        .eq('event_type', event.event_type)
        .eq('payload->>idempotency_key', event.idempotencyKey)
        .maybeSingle();
      if (existing) return true;
    }

    const { error } = await supabase.from('delivery_events').insert({
      order_id: event.order_id,
      driver_id: event.driver_id,
      event_type: event.event_type,
      payload: event.payload
        ? { ...event.payload, idempotency_key: event.idempotencyKey }
        : event.idempotencyKey
          ? { idempotency_key: event.idempotencyKey }
          : null,
    });

    if (error) {
      throw error;
    }
    return true;
  };

  enqueueWrite(run);
  return true;
}

export async function getDeliveryEventsByOrder(orderId: string): Promise<DeliveryEvent[]> {
  const { data, error } = await supabase
    .from('delivery_events')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching delivery events:', error);
    return [];
  }

  return data || [];
}

export function computeEtaBand(input: EtaComputationInput): EtaComputation {
  const {
    prepP50Minutes,
    prepP90Minutes,
    bufferMinutes = 5,
    travelMinutes,
    weatherSeverity = 'normal',
    reliabilityScore = 0.9,
    dataFresh = true,
  } = input;

  const weatherFactor = weatherSeverity === 'storm' ? 1.3 : weatherSeverity === 'rain' ? 1.12 : 1;
  const safeTravel = Math.max(5, travelMinutes);
  const p50 = prepP50Minutes + bufferMinutes;
  const p90 = prepP90Minutes + bufferMinutes + 3; // small cushion to avoid under-promising

  const etaLow = Math.round(p50 + safeTravel * weatherFactor);
  const etaHigh = Math.round(p90 + safeTravel * weatherFactor + 4);
  const etaMid = Math.round((etaLow + etaHigh) / 2);

  const bandWidth = etaHigh - etaLow;
  const bandTooWide = bandWidth > 25;
  const dataStale = reliabilityScore < 0.75 || !dataFresh;
  const trusted = reliabilityScore >= 0.9 && weatherFactor <= 1.15 && !bandTooWide && !dataStale;

  return {
    etaMinutes: etaMid,
    etaLowMinutes: etaLow,
    etaHighMinutes: etaHigh,
    trusted,
    weatherFactor,
    bandWidthMinutes: bandWidth,
    bandTooWide,
    dataStale,
  };
}

export function weatherFactorFromSeverity(severity: 'normal' | 'rain' | 'storm'): number {
  switch (severity) {
    case 'storm':
      return 1.3;
    case 'rain':
      return 1.12;
    default:
      return 1;
  }
}

export function etaTimestampsFromNow(band: EtaComputation, now = new Date()) {
  const base = now.getTime();
  return {
    eta_promised: new Date(base + band.etaMinutes * 60 * 1000).toISOString(),
    eta_confidence_low: new Date(base + band.etaLowMinutes * 60 * 1000).toISOString(),
    eta_confidence_high: new Date(base + band.etaHighMinutes * 60 * 1000).toISOString(),
  };
}

export async function logAudit(
  action: string,
  tableName: string,
  recordId?: string,
  detail?: Record<string, any>,
  actor?: string
): Promise<boolean> {
  const run = async () => {
    if (detail?.idempotency_key) {
      const { data: existing } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('action', action)
        .eq('table_name', tableName)
        .eq('record_id', recordId ?? null)
        .eq('detail->>idempotency_key', String(detail.idempotency_key))
        .maybeSingle();
      if (existing) return true;
    }

    const { error } = await supabase.from('audit_logs').insert({
      action,
      table_name: tableName,
      record_id: recordId ?? null,
      detail: detail ?? null,
      actor: actor ?? null,
    });
    if (error) throw error;
    return true;
  };
  enqueueWrite(run);
  return true;
}

export async function logRerouteDecision(
  orderId: string,
  backupRestaurantId: string | null,
  decision: 'approve' | 'decline' | 'cancel',
  reason?: string,
  actor?: string
): Promise<void> {
  const payload = { backup_restaurant_id: backupRestaurantId, decision, reason };
  const idem = `reroute_${orderId}_${backupRestaurantId ?? 'none'}_${decision}`;
  await createDeliveryEvent({
    order_id: orderId,
    event_type: 'auto_reroute_decision',
    payload,
    idempotencyKey: idem,
  });
  await logAudit('auto_reroute', 'orders', orderId, { ...payload, idempotency_key: idem }, actor);
}
