import ExpoModulesCore
import ActivityKit
import WidgetKit

public class ReactNativeWidgetExtensionModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ReactNativeWidgetExtension")

        Function("areActivitiesEnabled") { () -> Bool in
            if #available(iOS 16.2, *) {
                return ActivityAuthorizationInfo().areActivitiesEnabled
            } else {
                return false
            }
        }

        Function("reloadAllTimelines") { () -> Void in
            WidgetCenter.shared.reloadAllTimelines()
        }

        Function("reloadTimelines") { (kind: String) -> Void in
            WidgetCenter.shared.reloadTimelines(ofKind: kind)
        }

        // Write data to shared UserDefaults (App Group) for widget access
        Function("setSharedData") { (key: String, value: String, appGroupId: String) -> Bool in
            guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
                print("[Widget Module] Failed to access UserDefaults for app group: \(appGroupId)")
                return false
            }
            userDefaults.set(value, forKey: key)
            userDefaults.synchronize()
            print("[Widget Module] Successfully wrote data to key '\(key)' in app group '\(appGroupId)'")
            return true
        }

        // Read data from shared UserDefaults (App Group) - useful for debugging
        Function("getSharedData") { (key: String, appGroupId: String) -> String? in
            guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
                print("[Widget Module] Failed to access UserDefaults for app group: \(appGroupId)")
                return nil
            }
            return userDefaults.string(forKey: key)
        }
    }
}
