import { Dimensions, ScaledSize } from 'react-native';
import { heightPercentageToDP as heightToDP, widthPercentageToDP as widthToDP } from 'react-native-responsive-screen';

type PercentValue = `${number}%` | number;

let windowSize = Dimensions.get('window');

const subscription = Dimensions.addEventListener('change', ({ window }: { window: ScaledSize }) => {
  windowSize = window;
});

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

const toPercentage = (value: PercentValue) => {
  if (typeof value === 'string') return parseFloat(value.replace('%', ''));
  return value;
};

export const wp = (value: PercentValue) => {
  const percent = toPercentage(value);
  return widthToDP(`${percent}%`);
};

export const hp = (value: PercentValue) => {
  const percent = toPercentage(value);
  return heightToDP(`${percent}%`);
};

// Responsive font sizing that tracks screen width against a 390pt baseline.
export const rf = (size: number) => (windowSize.width * size) / BASE_WIDTH;
// Responsive spacing helper; rounds to whole pixels for consistent gutters.
export const sp = (size: number) => Math.round((windowSize.width * size) / BASE_WIDTH);

export function removeResponsiveListener() {
  subscription?.remove?.();
}
