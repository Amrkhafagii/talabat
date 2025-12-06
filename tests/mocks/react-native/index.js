import React from 'react';

const View = ({ children, ...props }) => React.createElement('div', props, children);
const Text = ({ children, ...props }) => React.createElement('span', props, children);
const ScrollView = ({ children, ...props }) => React.createElement('div', props, children);
const Image = ({ children: _children, ...props }) => React.createElement('img', props);
const ActivityIndicator = props => React.createElement('div', props, 'Loading…');
const TextInput = React.forwardRef((props, ref) => React.createElement('input', { ...props, ref }));
const TouchableOpacity = ({ children, onPress, ...props }) => React.createElement('button', { ...props, onClick: onPress }, children);
const Switch = ({ value, onValueChange, ...props }) =>
  React.createElement('input', { ...props, type: 'checkbox', checked: !!value, onChange: e => onValueChange?.(e.target.checked) });
const StyleSheet = { create: styles => styles };
const Platform = { OS: 'web' };
const NativeModules = {};
class NativeEventEmitter {
  addListener() {
    return { remove() {} };
  }
  removeAllListeners() {}
}
const DeviceEventEmitter = new NativeEventEmitter();
const TurboModuleRegistry = {
  get() {
    return {};
  },
  getEnforcing() {
    return {};
  },
};
const Linking = {
  openURL: async () => {},
  addEventListener: () => ({ remove() {} }),
};
const PixelRatio = {
  get: () => 1,
  roundToNearestPixel: v => v,
};
const AppRegistry = {
  registerComponent: () => {},
  runApplication: () => {},
};
const LogBox = {
  ignoreAllLogs: () => {},
};

export {
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Platform,
  NativeModules,
  NativeEventEmitter,
  DeviceEventEmitter,
  TurboModuleRegistry,
  Linking,
  PixelRatio,
  AppRegistry,
  LogBox,
};
