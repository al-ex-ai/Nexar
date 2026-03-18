/**
 * Platform capabilities inform the AI engine what's available
 * on the target device.
 */
export type PlatformCapability =
  | 'keyboard'
  | 'touch'
  | 'mouse'
  | 'voice'
  | 'camera'
  | 'barcode-scan'
  | 'biometric'
  | 'geolocation'
  | 'notifications'
  | 'haptics'
  | 'drag-drop'
  | 'clipboard'
  | 'file-upload'
  | 'offline';

/**
 * Platform traits define what a component supports per platform.
 */
export interface PlatformTraits {
  readonly web?: PlatformSupport | undefined;
  readonly mobile?: PlatformSupport | undefined;
  readonly tablet?: PlatformSupport | undefined;
  readonly tv?: PlatformSupport | undefined;
  readonly terminal?: PlatformSupport | undefined;
}

export interface PlatformSupport {
  /** Whether this component is supported on this platform */
  readonly supported: boolean;

  /** Capabilities this component uses on this platform */
  readonly capabilities?: readonly PlatformCapability[] | undefined;

  /** Platform-specific prop overrides */
  readonly defaultProps?: Readonly<Record<string, unknown>> | undefined;
}
