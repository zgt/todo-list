import ExpoModulesCore
import WidgetKit

public class WidgetDataSharingModule: Module {
    public func definition() -> ModuleDefinition {
        Name("WidgetDataSharing")

        // Write data to shared UserDefaults (App Group) for widget access
        Function("setSharedData") { (key: String, value: String, appGroupId: String) -> Bool in
            guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
                print("[WidgetDataSharing] Failed to access UserDefaults for app group: \(appGroupId)")
                return false
            }
            userDefaults.set(value, forKey: key)
            userDefaults.synchronize()
            print("[WidgetDataSharing] Successfully wrote data to key '\(key)' in app group '\(appGroupId)'")
            return true
        }

        // Read data from shared UserDefaults (App Group) - useful for debugging
        Function("getSharedData") { (key: String, appGroupId: String) -> String? in
            guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
                print("[WidgetDataSharing] Failed to access UserDefaults for app group: \(appGroupId)")
                return nil
            }
            return userDefaults.string(forKey: key)
        }

        // Reload all widget timelines
        Function("reloadAllTimelines") { () -> Void in
            WidgetCenter.shared.reloadAllTimelines()
            print("[WidgetDataSharing] Triggered reload of all widget timelines")
        }

        // Reload specific widget timeline by kind
        Function("reloadTimelines") { (kind: String) -> Void in
            WidgetCenter.shared.reloadTimelines(ofKind: kind)
            print("[WidgetDataSharing] Triggered reload of widget timeline: \(kind)")
        }
    }
}
