import Module from 'node:module';
import path from 'node:path';
import { vi } from 'vitest';

(globalThis as any).__DEV__ = false;

const originalLoad = (Module as any)._load as (request: string, parent: any, isMain: boolean) => any;
const rnStub = path.resolve(__dirname, './mocks/react-native/index.js');
const rnSafeStub = path.resolve(__dirname, './mocks/react-native-safe-area-context.js');
const rnCodegenStub = path.resolve(__dirname, './mocks/react-native/Libraries/Utilities/codegenNativeComponent.js');
const clipboardStub = path.resolve(__dirname, './mocks/expo-clipboard.js');
const expoModulesCoreStub = path.resolve(__dirname, './mocks/expo-modules-core.js');
const expoConstantsStub = path.resolve(__dirname, './mocks/expo-constants.js');

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'react-native') {
    return originalLoad(rnStub, parent, isMain);
  }
  if (request.startsWith('react-native/')) {
    return originalLoad(rnCodegenStub, parent, isMain);
  }
  if (request === 'react-native-safe-area-context') {
    return originalLoad(rnSafeStub, parent, isMain);
  }
  if (request === 'expo-clipboard') {
    return originalLoad(clipboardStub, parent, isMain);
  }
  if (request === 'expo-modules-core') {
    return originalLoad(expoModulesCoreStub, parent, isMain);
  }
  if (request === 'expo-constants') {
    return originalLoad(expoConstantsStub, parent, isMain);
  }
  return originalLoad(request, parent, isMain);
};

(vi as any).mock('react-native', () => import('./mocks/react-native/index.js'), { virtual: true });
(vi as any).mock(
  'react-native/Libraries/Utilities/codegenNativeComponent',
  () => import('./mocks/react-native/Libraries/Utilities/codegenNativeComponent.js'),
  { virtual: true }
);
(vi as any).mock('react-native-safe-area-context', () => import('./mocks/react-native-safe-area-context.js'), { virtual: true });
(vi as any).mock('expo-clipboard', () => import('./mocks/expo-clipboard.js'), { virtual: true });
(vi as any).mock('expo-modules-core', () => import('./mocks/expo-modules-core.js'), { virtual: true });
(vi as any).mock('expo-constants', () => import('./mocks/expo-constants.js'), { virtual: true });
