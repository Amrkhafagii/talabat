import { useCallback, useEffect, useRef, useState } from 'react';

export type ActionKind = 'payment' | 'license' | 'photo';
export type ActionType = 'approve' | 'reject';

export type ActionBannerState = {
  text: string;
  tone?: 'success' | 'warning' | 'error';
  undo?: () => void;
};

type PendingAction<T> = {
  kind: ActionKind;
  action: ActionType;
  item: T;
  restore: (item: T) => void;
  timer: ReturnType<typeof setTimeout>;
};

type QueueActionOptions<T> = {
  kind: ActionKind;
  action: ActionType;
  item: T;
  onCommit: () => Promise<void>;
  onRestore: (item: T) => void;
  onDequeue: () => void;
  queuedText: string;
  queuedTone?: 'success' | 'warning' | 'error';
  delayMs?: number;
  cooldownMs?: number;
};

export const useActionQueue = () => {
  const [actionBanner, setActionBanner] = useState<ActionBannerState | null>(null);
  const pendingRef = useRef<PendingAction<any> | null>(null);
  const lastActionAt = useRef(0);

  const undoPending = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pending.restore(pending.item);
    pendingRef.current = null;
    setActionBanner({ text: 'Action canceled.', tone: 'warning' });
  }, []);

  const queueAction = useCallback(
    <T,>(opts: QueueActionOptions<T>) => {
      const cooldownMs = opts.cooldownMs ?? 500;
      if (Date.now() - lastActionAt.current < cooldownMs) {
        setActionBanner({ text: 'Too many actions. Please wait a moment.', tone: 'warning' });
        return false;
      }
      lastActionAt.current = Date.now();

      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timer);
        pendingRef.current.restore(pendingRef.current.item);
        pendingRef.current = null;
      }

      opts.onDequeue();
      const timer = setTimeout(async () => {
        try {
          await opts.onCommit();
        } finally {
          pendingRef.current = null;
          setActionBanner(null);
        }
      }, opts.delayMs ?? 800);

      pendingRef.current = {
        kind: opts.kind,
        action: opts.action,
        item: opts.item,
        restore: opts.onRestore,
        timer,
      };

      setActionBanner({
        text: opts.queuedText,
        tone: opts.queuedTone ?? 'success',
        undo: undoPending,
      });

      return true;
    },
    [undoPending]
  );

  useEffect(
    () => () => {
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timer);
        pendingRef.current.restore(pendingRef.current.item);
        pendingRef.current = null;
      }
    },
    []
  );

  return { actionBanner, queueAction, undoPending };
};
