import { requireNativeModule } from "expo-modules-core";

// Define the module interface
interface WidgetDataSharingModule {
  setSharedData(key: string, value: string, appGroupId: string): boolean;
  getSharedData(key: string, appGroupId: string): string | null;
  reloadAllTimelines(): void;
  reloadTimelines(kind: string): void;
}

// Require the native module
const WidgetDataSharing =
  requireNativeModule<WidgetDataSharingModule>("WidgetDataSharing");

export function setSharedData(
  key: string,
  value: string,
  appGroupId: string,
): boolean {
  return WidgetDataSharing.setSharedData(key, value, appGroupId);
}

export function getSharedData(
  key: string,
  appGroupId: string,
): string | null {
  return WidgetDataSharing.getSharedData(key, appGroupId);
}

export function reloadAllTimelines(): void {
  WidgetDataSharing.reloadAllTimelines();
}

export function reloadTimelines(kind: string): void {
  WidgetDataSharing.reloadTimelines(kind);
}
