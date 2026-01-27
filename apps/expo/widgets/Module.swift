import WidgetKit

@objc(TodoWidgetModule)
class TodoWidgetModule: NSObject {
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
}
