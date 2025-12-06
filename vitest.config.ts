import { defineConfig } from 'vitest/config';
import path from 'node:path';

// eslint-disable-next-line no-console
console.log('vitest config loaded');

export default defineConfig({
  plugins: [
    {
      name: 'stub-react-native',
      resolveId(source) {
        if (source === 'react-native') {
          return path.resolve(__dirname, 'tests/mocks/react-native/index.js');
        }
        if (source.startsWith('react-native/')) {
          return path.resolve(__dirname, 'tests/mocks/react-native', `${source.replace('react-native/', '')}.js`);
        }
        if (source === 'react-native-safe-area-context') {
          return path.resolve(__dirname, 'tests/mocks/react-native-safe-area-context.js');
        }
        if (source === 'expo-clipboard') {
          return path.resolve(__dirname, 'tests/mocks/expo-clipboard.js');
        }
        if (source === 'expo-modules-core') {
          return path.resolve(__dirname, 'tests/mocks/expo-modules-core.js');
        }
        if (source === 'expo-constants') {
          return path.resolve(__dirname, 'tests/mocks/expo-constants.js');
        }
        return null;
      },
    },
  ],
  ssr: {
    noExternal: [
      'react-native',
      'react-native-safe-area-context',
      'expo',
      'expo-asset',
      'expo-modules-core',
      'expo-linking',
      'expo-constants',
      'expo-clipboard',
      '@testing-library/react-native',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'react-native': path.resolve(__dirname, 'tests/mocks/react-native/index.js'),
      'react-native/Libraries/Utilities/codegenNativeComponent': path.resolve(
        __dirname,
        'tests/mocks/react-native/Libraries/Utilities/codegenNativeComponent.js'
      ),
      'react-native-safe-area-context': path.resolve(__dirname, 'tests/mocks/react-native-safe-area-context.js'),
      'expo-clipboard': path.resolve(__dirname, 'tests/mocks/expo-clipboard.js'),
      'expo-modules-core': path.resolve(__dirname, 'tests/mocks/expo-modules-core.js'),
      'expo-constants': path.resolve(__dirname, 'tests/mocks/expo-constants.js'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: './tests/setupVitest.ts',
    deps: {
      optimizer: {
        ssr: {
          include: ['react-native', 'react-native-safe-area-context', 'expo', 'expo-asset', 'expo-modules-core', 'expo-linking', 'expo-constants', 'expo-clipboard', '@testing-library/react-native'],
        },
      },
    },
    server: {
      deps: {
        inline: ['react-native', 'react-native-safe-area-context', 'expo', 'expo-asset', 'expo-modules-core', 'expo-linking', 'expo-constants', 'expo-clipboard', '@testing-library/react-native'],
      },
    },
  },
});
