import { RefObject, useCallback, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

type SectionLoaderMap = Partial<Record<string, () => void | Promise<void>>>;

type UseSectionScrollParams = {
  scrollRef: RefObject<ScrollView | null>;
  defaultSectionY: Record<string, number>;
  sectionLoaded: Record<string, boolean>;
  loaders: SectionLoaderMap;
  onActiveSection?: (key: string) => void;
};

export const useSectionScroll = ({
  scrollRef,
  defaultSectionY,
  sectionLoaded,
  loaders,
  onActiveSection,
}: UseSectionScrollParams) => {
  const [sectionPositions, setSectionPositions] = useState<Record<string, number>>({});

  const recordSectionPosition = useCallback((key: string, y: number) => {
    setSectionPositions(prev => ({ ...prev, [key]: y }));
  }, []);

  const ensureSectionLoaded = useCallback(
    (key: string) => {
      if (sectionLoaded[key]) return;
      const loader = loaders[key];
      if (loader) loader();
    },
    [loaders, sectionLoaded]
  );

  const scrollToSection = useCallback(
    (key: string) => {
      onActiveSection?.(key);
      ensureSectionLoaded(key);
      const attemptScroll = (attempt = 0) => {
        const y = sectionPositions[key] ?? defaultSectionY[key] ?? 0;
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ y: Math.max(y - 12, 0), animated: true });
          return;
        }
        if (attempt < 4) {
          requestAnimationFrame(() => attemptScroll(attempt + 1));
        }
      };
      attemptScroll();
    },
    [defaultSectionY, ensureSectionLoaded, onActiveSection, scrollRef, sectionPositions]
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const viewportH = e.nativeEvent.layoutMeasurement.height;
      Object.entries(sectionPositions).forEach(([key, pos]) => {
        if (!sectionLoaded[key] && pos < offsetY + viewportH + 120) {
          ensureSectionLoaded(key);
        }
      });
    },
    [ensureSectionLoaded, sectionLoaded, sectionPositions]
  );

  return {
    recordSectionPosition,
    ensureSectionLoaded,
    scrollToSection,
    onScroll,
  };
};
