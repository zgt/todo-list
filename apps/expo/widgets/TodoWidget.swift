import WidgetKit
import SwiftUI

// MARK: - Data Models

struct TaskItem: Codable, Identifiable {
    let id: String
    let title: String
    let completed: Bool
    let categoryName: String?
    let categoryColor: String?
    let dueDate: Date?
}

struct WidgetData: Codable {
    let tasks: [TaskItem]
    let totalCount: Int
    let completedCount: Int
    let updatedAt: Date
}

// MARK: - Timeline Entry

struct TodoWidgetEntry: TimelineEntry {
    let date: Date
    let tasks: [TaskItem]
    let totalCount: Int
    let completedCount: Int
    let configuration: ConfigurationAppIntent
}

// MARK: - Timeline Provider

struct TodoWidgetProvider: AppIntentTimelineProvider {

    // App Group identifier for shared data
    private let appGroupId = "group.com.zgtf.todolist"

    func placeholder(in context: Context) -> TodoWidgetEntry {
        TodoWidgetEntry(
            date: Date(),
            tasks: [
                TaskItem(id: "1", title: "Loading tasks...", completed: false, categoryName: nil, categoryColor: nil, dueDate: nil)
            ],
            totalCount: 0,
            completedCount: 0,
            configuration: ConfigurationAppIntent()
        )
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> TodoWidgetEntry {
        let data = loadWidgetData()
        return TodoWidgetEntry(
            date: Date(),
            tasks: Array(data.tasks.prefix(getMaxTasks(for: context.family))),
            totalCount: data.totalCount,
            completedCount: data.completedCount,
            configuration: configuration
        )
    }

    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<TodoWidgetEntry> {
        let data = loadWidgetData()
        let maxTasks = getMaxTasks(for: context.family)

        let entry = TodoWidgetEntry(
            date: Date(),
            tasks: Array(data.tasks.prefix(maxTasks)),
            totalCount: data.totalCount,
            completedCount: data.completedCount,
            configuration: configuration
        )

        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!

        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }

    private func getMaxTasks(for family: WidgetFamily) -> Int {
        switch family {
        case .systemSmall:
            return 2
        case .systemMedium:
            return 3
        case .systemLarge:
            return 6
        case .systemExtraLarge:
            return 10
        @unknown default:
            return 3
        }
    }

    private func loadWidgetData() -> WidgetData {
        guard let userDefaults = UserDefaults(suiteName: appGroupId),
              let jsonString = userDefaults.string(forKey: "widgetData"),
              let jsonData = jsonString.data(using: .utf8) else {
            return WidgetData(tasks: [], totalCount: 0, completedCount: 0, updatedAt: Date())
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        do {
            return try decoder.decode(WidgetData.self, from: jsonData)
        } catch {
            print("Failed to decode widget data: \(error)")
            return WidgetData(tasks: [], totalCount: 0, completedCount: 0, updatedAt: Date())
        }
    }
}

// MARK: - Configuration Intent

struct ConfigurationAppIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Todo Widget"
    static var description = IntentDescription("Display your pending tasks")
}

// MARK: - Design Colors

extension Color {
    // Design system colors
    static let backgroundDeep = Color(red: 10/255, green: 26/255, blue: 26/255)
    static let surfaceBase = Color(red: 16/255, green: 42/255, blue: 42/255)
    static let primaryEmerald = Color(red: 80/255, green: 200/255, blue: 120/255)
    static let textPrimary = Color(red: 220/255, green: 228/255, blue: 228/255)
    static let textMuted = Color(red: 143/255, green: 168/255, blue: 168/255)
    static let borderDefault = Color(red: 22/255, green: 75/255, blue: 73/255)
}

// MARK: - Widget Views

struct TodoWidgetEntryView: View {
    var entry: TodoWidgetProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .systemLarge:
            LargeWidgetView(entry: entry)
        default:
            MediumWidgetView(entry: entry)
        }
    }
}

// MARK: - Small Widget

struct SmallWidgetView: View {
    let entry: TodoWidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.primaryEmerald)
                    .font(.headline)
                Text("Tasks")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.textPrimary)
                Spacer()
            }

            Spacer()

            // Progress
            if entry.totalCount > 0 {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(entry.completedCount)/\(entry.totalCount)")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.primaryEmerald)
                    Text("completed")
                        .font(.caption)
                        .foregroundColor(.textMuted)
                }
            } else {
                Text("No tasks")
                    .font(.subheadline)
                    .foregroundColor(.textMuted)
            }

            Spacer()
        }
        .padding()
        .containerBackground(.backgroundDeep, for: .widget)
    }
}

// MARK: - Medium Widget

struct MediumWidgetView: View {
    let entry: TodoWidgetEntry

    var body: some View {
        HStack(spacing: 16) {
            // Left: Stats
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.primaryEmerald)
                    Text("Tasks")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(.textPrimary)
                }

                Spacer()

                if entry.totalCount > 0 {
                    Text("\(entry.completedCount)/\(entry.totalCount)")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.primaryEmerald)

                    ProgressView(value: Double(entry.completedCount), total: Double(entry.totalCount))
                        .tint(.primaryEmerald)
                        .scaleEffect(y: 2)
                } else {
                    Text("No tasks")
                        .font(.subheadline)
                        .foregroundColor(.textMuted)
                }
            }
            .frame(maxWidth: 80)

            // Divider
            Rectangle()
                .fill(Color.borderDefault)
                .frame(width: 1)

            // Right: Task list
            VStack(alignment: .leading, spacing: 6) {
                ForEach(entry.tasks) { task in
                    TaskRowView(task: task)
                }

                if entry.tasks.isEmpty {
                    Text("All caught up!")
                        .font(.subheadline)
                        .foregroundColor(.textMuted)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }

                Spacer(minLength: 0)
            }
        }
        .padding()
        .containerBackground(.backgroundDeep, for: .widget)
    }
}

// MARK: - Large Widget

struct LargeWidgetView: View {
    let entry: TodoWidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.primaryEmerald)
                    .font(.title2)
                Text("Tasks")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.textPrimary)

                Spacer()

                if entry.totalCount > 0 {
                    Text("\(entry.completedCount)/\(entry.totalCount)")
                        .font(.headline)
                        .foregroundColor(.primaryEmerald)
                }
            }

            if entry.totalCount > 0 {
                ProgressView(value: Double(entry.completedCount), total: Double(entry.totalCount))
                    .tint(.primaryEmerald)
                    .scaleEffect(y: 1.5)
            }

            Divider()
                .background(Color.borderDefault)

            // Task list
            VStack(alignment: .leading, spacing: 8) {
                ForEach(entry.tasks) { task in
                    TaskRowView(task: task, showCategory: true)
                }

                if entry.tasks.isEmpty {
                    VStack(spacing: 8) {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.largeTitle)
                            .foregroundColor(.primaryEmerald)
                        Text("All caught up!")
                            .font(.headline)
                            .foregroundColor(.textPrimary)
                        Text("No pending tasks")
                            .font(.subheadline)
                            .foregroundColor(.textMuted)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }

                Spacer(minLength: 0)
            }
        }
        .padding()
        .containerBackground(.backgroundDeep, for: .widget)
    }
}

// MARK: - Task Row

struct TaskRowView: View {
    let task: TaskItem
    var showCategory: Bool = false

    var body: some View {
        HStack(spacing: 8) {
            // Checkbox
            Image(systemName: task.completed ? "checkmark.circle.fill" : "circle")
                .foregroundColor(task.completed ? .primaryEmerald : .textMuted)
                .font(.system(size: 16))

            // Title
            Text(task.title)
                .font(.subheadline)
                .foregroundColor(task.completed ? .textMuted : .textPrimary)
                .strikethrough(task.completed)
                .lineLimit(1)

            Spacer()

            // Category badge
            if showCategory, let categoryName = task.categoryName {
                Text(categoryName)
                    .font(.caption2)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(categoryColor.opacity(0.3))
                    .foregroundColor(categoryColor)
                    .cornerRadius(4)
            }
        }
    }

    private var categoryColor: Color {
        guard let hex = task.categoryColor else { return .primaryEmerald }
        return Color(hex: hex)
    }
}

// MARK: - Color Extension for Hex

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Widget Definition

struct TodoWidget: Widget {
    let kind: String = "TodoWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: ConfigurationAppIntent.self,
            provider: TodoWidgetProvider()
        ) { entry in
            TodoWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Todo List")
        .description("View your pending tasks at a glance")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Preview

#Preview(as: .systemSmall) {
    TodoWidget()
} timeline: {
    TodoWidgetEntry(
        date: .now,
        tasks: [
            TaskItem(id: "1", title: "Buy groceries", completed: false, categoryName: "Shopping", categoryColor: "#FFD700", dueDate: nil),
            TaskItem(id: "2", title: "Call dentist", completed: true, categoryName: "Health", categoryColor: "#66D99A", dueDate: nil)
        ],
        totalCount: 5,
        completedCount: 2,
        configuration: ConfigurationAppIntent()
    )
}

#Preview(as: .systemMedium) {
    TodoWidget()
} timeline: {
    TodoWidgetEntry(
        date: .now,
        tasks: [
            TaskItem(id: "1", title: "Buy groceries", completed: false, categoryName: "Shopping", categoryColor: "#FFD700", dueDate: nil),
            TaskItem(id: "2", title: "Call dentist", completed: false, categoryName: "Health", categoryColor: "#66D99A", dueDate: nil),
            TaskItem(id: "3", title: "Review PRs", completed: true, categoryName: "Work", categoryColor: "#66D99A", dueDate: nil)
        ],
        totalCount: 8,
        completedCount: 3,
        configuration: ConfigurationAppIntent()
    )
}
