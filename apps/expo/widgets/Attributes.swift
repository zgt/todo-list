import ActivityKit
import WidgetKit
import SwiftUI

struct TodoWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var taskCount: Int
        var completedCount: Int
    }

    var name: String
}
