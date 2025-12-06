export class EventEmitter {
  addListener() {
    return { remove() {} };
  }
  removeAllListeners() {}
  emit() {}
}

export class CodedError extends Error {}
export const NativeModulesProxy = {};
export const requireNativeModule = () => ({});
export const requireOptionalNativeModule = () => null;
export const Platform = {
  OS: 'web',
  select(options) {
    return options?.web ?? options?.default ?? null;
  },
};
