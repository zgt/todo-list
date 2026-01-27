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
    }
}
