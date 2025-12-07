import { useCallback, useState } from 'react';
import {
  getPaymentReviewQueue,
  getDriverLicenseReviews,
  getMenuPhotoReviews,
  getRestaurantPayablesPending,
  getDriverPayablesPending,
  listPayoutBalances,
  type PaymentReviewItem,
  type DriverLicenseReview,
  type MenuPhotoReview,
  type RestaurantPayable,
  type DriverPayable,
} from '@/utils/database';

export type RestaurantPayoutFilter = { restaurantId: string; status: string; payoutRef: string; createdAfter: string; createdBefore: string };
export type DriverPayoutFilter = { driverId: string; status: string; payoutRef: string; createdAfter: string; createdBefore: string };

type RefreshAllParams = {
  restFilter?: RestaurantPayoutFilter;
  driverFilter?: DriverPayoutFilter;
};

export function useAdminOpsData() {
  const [reviewQueue, setReviewQueue] = useState<PaymentReviewItem[]>([]);
  const [licenseQueue, setLicenseQueue] = useState<DriverLicenseReview[]>([]);
  const [photoQueue, setPhotoQueue] = useState<MenuPhotoReview[]>([]);
  const [restaurantPayables, setRestaurantPayables] = useState<RestaurantPayable[]>([]);
  const [driverPayables, setDriverPayables] = useState<DriverPayable[]>([]);
  const [payoutBalances, setPayoutBalances] = useState<any[]>([]);
  const [walletTx, setWalletTx] = useState<Record<string, any[]>>({});

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [opsLoading, setOpsLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const loadPaymentQueue = useCallback(async () => {
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const queue = await getPaymentReviewQueue();
      setReviewQueue(queue);
    } catch (err: any) {
      console.error('loadPaymentQueue error', err);
      setPaymentError('Failed to load payments. Tap refresh.');
    } finally {
      setPaymentLoading(false);
    }
  }, []);

  const loadLicenses = useCallback(async () => {
    setLicenseLoading(true);
    try {
      const licenses = await getDriverLicenseReviews();
      setLicenseQueue(licenses);
    } catch (err) {
      console.error('loadLicenses error', err);
      setLicenseQueue([]);
    } finally {
      setLicenseLoading(false);
    }
  }, []);

  const loadPhotos = useCallback(async () => {
    setPhotoLoading(true);
    try {
      const photos = await getMenuPhotoReviews();
      setPhotoQueue(photos);
    } catch (err) {
      console.error('loadPhotos error', err);
      setPhotoQueue([]);
    } finally {
      setPhotoLoading(false);
    }
  }, []);

  const loadPayouts = useCallback(
    async (restFilter?: RestaurantPayoutFilter, driverFilter?: DriverPayoutFilter) => {
      setPayoutLoading(true);
      try {
        const [restPayables, drvPayables, balances] = await Promise.all([
          getRestaurantPayablesPending({
            restaurantId: restFilter?.restaurantId || null,
            status: restFilter?.status || null,
            payoutRef: restFilter?.payoutRef || null,
            createdAfter: restFilter?.createdAfter || null,
            createdBefore: restFilter?.createdBefore || null,
          }),
          getDriverPayablesPending({
            driverId: driverFilter?.driverId || null,
            status: driverFilter?.status || null,
            payoutRef: driverFilter?.payoutRef || null,
            createdAfter: driverFilter?.createdAfter || null,
            createdBefore: driverFilter?.createdBefore || null,
          }),
          listPayoutBalances(),
        ]);
        setRestaurantPayables(restPayables);
        setDriverPayables(drvPayables);
        setPayoutBalances(balances);
      } catch (err) {
        console.error('loadPayouts error', err);
        setRestaurantPayables([]);
        setDriverPayables([]);
        setPayoutBalances([]);
      } finally {
        setPayoutLoading(false);
      }
    },
    []
  );

  const loadOpsData = useCallback(
    async (restFilter?: RestaurantPayoutFilter, driverFilter?: DriverPayoutFilter) => {
      setOpsLoading(true);
      await Promise.all([loadPaymentQueue(), loadPayouts(restFilter, driverFilter), loadLicenses(), loadPhotos()]);
      setOpsLoading(false);
    },
    [loadLicenses, loadPaymentQueue, loadPhotos, loadPayouts]
  );

  const refreshAll = useCallback(
    async (params?: RefreshAllParams) => {
      await loadOpsData(params?.restFilter, params?.driverFilter);
    },
    [loadOpsData]
  );

  return {
    reviewQueue,
    setReviewQueue,
    licenseQueue,
    setLicenseQueue,
    photoQueue,
    setPhotoQueue,
    restaurantPayables,
    driverPayables,
    paymentLoading,
    licenseLoading,
    photoLoading,
    payoutLoading,
    opsLoading,
    paymentError,
    payoutBalances,
    walletTx,
    setWalletTx,
    loadPaymentQueue,
    loadLicenses,
    loadPhotos,
    loadPayouts,
    loadOpsData,
    refreshAll,
  };
}
