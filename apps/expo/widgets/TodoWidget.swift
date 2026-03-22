import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Data Models

struct TaskItem: Codable, Identifiable {
    let id: String
    let title: String
    var completed: Bool
    let categoryId: String?
    let categoryName: String?
    let categoryColor: String?
    let dueDate: Date?
}

struct CategoryItem: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let color: String
}

struct WidgetData: Codable {
    var tasks: [TaskItem]
    var categories: [CategoryItem]
    var totalCount: Int
    var completedCount: Int
    let updatedAt: Date
}

// MARK: - Pending Widget Actions

struct PendingWidgetAction: Codable {
    let taskId: String
    let action: String        // "toggle"
    let completed: Bool       // new completed state
    let timestamp: Date
}

func loadPendingActions(from userDefaults: UserDefaults) -> [PendingWidgetAction] {
    guard let json = userDefaults.string(forKey: "pendingWidgetActions"),
          let data = json.data(using: .utf8) else { return [] }
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    return (try? decoder.decode([PendingWidgetAction].self, from: data)) ?? []
}

func savePendingActions(_ actions: [PendingWidgetAction], to userDefaults: UserDefaults) {
    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .iso8601
    if let data = try? encoder.encode(actions),
       let json = String(data: data, encoding: .utf8) {
        userDefaults.set(json, forKey: "pendingWidgetActions")
    }
}

// MARK: - Intents

struct ToggleTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Toggle Task"
    static var description = IntentDescription("Mark a task as complete or incomplete")

    @Parameter(title: "Task ID")
    var taskId: String

    init() {}

    init(taskId: String) {
        self.taskId = taskId
    }

    func perform() async throws -> some IntentResult {
        let appGroupId = "group.com.zgtf.todolist"
        guard let userDefaults = UserDefaults(suiteName: appGroupId),
              let jsonString = userDefaults.string(forKey: "widgetData"),
              let jsonData = jsonString.data(using: .utf8) else {
            return .result()
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        guard var widgetData = try? decoder.decode(WidgetData.self, from: jsonData) else {
            return .result()
        }

        // Toggle the task's completed status
        var newCompleted = false
        widgetData.tasks = widgetData.tasks.map { task in
            guard task.id == taskId else { return task }
            newCompleted = !task.completed
            var updated = task
            updated.completed = newCompleted
            return updated
        }

        // Update completed count
        widgetData.completedCount = widgetData.tasks.filter { $0.completed }.count

        // Write updated data back
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        if let encoded = try? encoder.encode(widgetData) {
            userDefaults.set(String(data: encoded, encoding: .utf8), forKey: "widgetData")
        }

        // Add to pending actions queue
        let action = PendingWidgetAction(
            taskId: taskId, action: "toggle",
            completed: newCompleted, timestamp: Date()
        )
        var pending = loadPendingActions(from: userDefaults)
        // Deduplicate: remove existing action for same task
        pending.removeAll { $0.taskId == taskId }
        pending.append(action)
        savePendingActions(pending, to: userDefaults)

        return .result()
    }
}

struct CycleCategoryIntent: AppIntent {
    static var title: LocalizedStringResource = "Cycle Category"
    static var description = IntentDescription("Cycle through available task categories")

    init() {}

    func perform() async throws -> some IntentResult {
        let appGroupId = "group.com.zgtf.todolist"
        guard let userDefaults = UserDefaults(suiteName: appGroupId) else {
            return .result()
        }
        
        // Load Widget Data to get available categories
        guard let jsonString = userDefaults.string(forKey: "widgetData"),
              let jsonData = jsonString.data(using: .utf8) else {
            return .result()
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        guard let widgetData = try? decoder.decode(WidgetData.self, from: jsonData) else {
            return .result()
        }
        
        let categories = widgetData.categories
        if categories.isEmpty {
            // No categories to cycle, ensure we are on "All" (nil)
            userDefaults.removeObject(forKey: "widgetFilterCategoryId")
            return .result()
        }
        
        // Get current filter
        let currentFilterId = userDefaults.string(forKey: "widgetFilterCategoryId")
        
        // Determine next category
        // Logic: All (nil) -> Cat 1 -> Cat 2 -> ... -> All (nil)
        
        var nextFilterId: String? = nil
        
        if let current = currentFilterId {
            if let index = categories.firstIndex(where: { $0.id == current }) {
                if index < categories.count - 1 {
                    nextFilterId = categories[index + 1].id
                } else {
                    // Reached end of list, go back to All (nil)
                    nextFilterId = nil
                }
            } else {
                // Current ID not found (maybe deleted), restart at All
                nextFilterId = nil
            }
        } else {
            // Currently at All, go to first category
            nextFilterId = categories.first?.id
        }
        
        // Save new filter
        if let next = nextFilterId {
            userDefaults.set(next, forKey: "widgetFilterCategoryId")
        } else {
            userDefaults.removeObject(forKey: "widgetFilterCategoryId")
        }
        
        return .result()
    }
}

// MARK: - Timeline Entry

struct TodoWidgetEntry: TimelineEntry {
    let date: Date
    let tasks: [TaskItem]
    let totalCount: Int
    let completedCount: Int
    let currentCategory: CategoryItem? // nil = All
}

// MARK: - Timeline Provider

struct TodoWidgetProvider: TimelineProvider {

    // App Group identifier for shared data
    private let appGroupId = "group.com.zgtf.todolist"

    func placeholder(in context: Context) -> TodoWidgetEntry {
        TodoWidgetEntry(
            date: Date(),
            tasks: [
                TaskItem(id: "1", title: "Loading tasks...", completed: false, categoryId: nil, categoryName: nil, categoryColor: nil, dueDate: nil)
            ],
            totalCount: 0,
            completedCount: 0,
            currentCategory: nil
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (TodoWidgetEntry) -> Void) {
        let (data, category) = loadFilteredData()
        let entry = TodoWidgetEntry(
            date: Date(),
            tasks: Array(data.tasks.prefix(getMaxTasks(for: context.family))),
            totalCount: data.totalCount,
            completedCount: data.completedCount,
            currentCategory: category
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodoWidgetEntry>) -> Void) {
        let (data, category) = loadFilteredData()
        let maxTasks = getMaxTasks(for: context.family)

        let entry = TodoWidgetEntry(
            date: Date(),
            tasks: Array(data.tasks.prefix(maxTasks)),
            totalCount: data.totalCount,
            completedCount: data.completedCount,
            currentCategory: category
        )

        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!

        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func getMaxTasks(for family: WidgetFamily) -> Int {
        switch family {
        case .systemSmall:
            return 2
        case .systemMedium:
            return 5
        case .systemLarge:
            return 9
        case .systemExtraLarge:
            return 9
        case .accessoryInline:
            return 0  // Just shows count
        case .accessoryCircular:
            return 0  // Just shows progress
        case .accessoryRectangular:
            return 3  // Shows 2 task titles
        @unknown default:
            return 3
        }
    }

    private func loadFilteredData() -> (WidgetData, CategoryItem?) {
        guard let userDefaults = UserDefaults(suiteName: appGroupId),
              let jsonString = userDefaults.string(forKey: "widgetData"),
              let jsonData = jsonString.data(using: .utf8) else {
            return (WidgetData(tasks: [], categories: [], totalCount: 0, completedCount: 0, updatedAt: Date()), nil)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        var data: WidgetData
        do {
            data = try decoder.decode(WidgetData.self, from: jsonData)
        } catch {
            print("Failed to decode widget data: \(error)")
            return (WidgetData(tasks: [], categories: [], totalCount: 0, completedCount: 0, updatedAt: Date()), nil)
        }
        
        // Filter Logic
        let filterId = userDefaults.string(forKey: "widgetFilterCategoryId")
        var currentCategory: CategoryItem? = nil
        
        if let filterId = filterId {
            if let category = data.categories.first(where: { $0.id == filterId }) {
                currentCategory = category
                // Filter tasks
                data.tasks = data.tasks.filter { $0.categoryId == filterId }
                // Recompute counts for the view
                data.totalCount = data.tasks.count // Note: this changes "Total" to "Total in Category"
                data.completedCount = data.tasks.filter { $0.completed }.count
            } else {
                // Category not found (maybe deleted), reset filter
                 userDefaults.removeObject(forKey: "widgetFilterCategoryId")
            }
        }
        
        return (data, currentCategory)
    }
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
        case .accessoryInline:
            AccessoryInlineView(entry: entry)
        case .accessoryCircular:
            AccessoryCircularView(entry: entry)
        case .accessoryRectangular:
            AccessoryRectangularView(entry: entry)
        default:
            MediumWidgetView(entry: entry)
        }
    }
}

struct CategoryCycleButton: View {
    let currentCategory: CategoryItem?
    var compact: Bool = false

    private var iconSize: CGFloat { compact ? 10 : 12 }
    private var textFont: Font { compact ? .footnote : .subheadline }
    private var hPadding: CGFloat { compact ? 10 : 14 }
    private var vPadding: CGFloat { compact ? 6 : 8 }

    var body: some View {
        Button(intent: CycleCategoryIntent()) {
            HStack(spacing: 6) {
                if let category = currentCategory {
                    Circle()
                        .fill(Color(hex: category.color))
                        .frame(width: iconSize, height: iconSize)
                    Text(category.name)
                        .font(textFont)
                        .fontWeight(.semibold)
                        .foregroundColor(.textPrimary)
                        .lineLimit(1)
                } else {
                    Image(systemName: "tray.full.fill")
                        .font(.system(size: compact ? 12 : 14))
                        .foregroundColor(.textMuted)
                    Text("All")
                        .font(textFont)
                        .fontWeight(.semibold)
                        .foregroundColor(.textMuted)
                }
            }
            .padding(.horizontal, hPadding)
            .padding(.vertical, vPadding)
            .background(Color.surfaceBase)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(currentCategory != nil ? Color(hex: currentCategory!.color).opacity(0.5) : Color.borderDefault, lineWidth: 1)
            )
            .cornerRadius(16)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Small Widget

struct SmallWidgetView: View {
    let entry: TodoWidgetEntry

    private var progress: Double {
        guard entry.totalCount > 0 else { return 0 }
        return Double(entry.completedCount) / Double(entry.totalCount)
    }

    private var incompleteTasks: [TaskItem] {
        entry.tasks.filter { !$0.completed }
    }

    var body: some View {
        VStack(spacing: 6) {
            // Top row: category on left, progress ring on right
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 6) {
                    CategoryCycleButton(currentCategory: entry.currentCategory, compact: true)

                    // Next tasks preview
                    if incompleteTasks.isEmpty {
                        Text("All caught up!")
                            .font(.caption)
                            .foregroundColor(.textMuted)
                    } else {
                        ForEach(incompleteTasks.prefix(2)) { task in
                            HStack(spacing: 4) {
                                Circle()
                                    .fill(Color.primaryEmerald.opacity(0.5))
                                    .frame(width: 4, height: 4)
                                Text(task.title)
                                    .font(.caption)
                                    .foregroundColor(.textPrimary)
                                    .lineLimit(1)
                            }
                        }
                    }
                }

                Spacer()

                // Progress ring
                ZStack {
                    Circle()
                        .stroke(Color.borderDefault, lineWidth: 6)

                    Circle()
                        .trim(from: 0, to: entry.totalCount > 0 ? progress : 0)
                        .stroke(Color.primaryEmerald, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                        .rotationEffect(.degrees(-90))

                    if entry.totalCount > 0 {
                        Text("\(entry.completedCount)/\(entry.totalCount)")
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                            .foregroundColor(.primaryEmerald)
                    } else {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.system(size: 18))
                            .foregroundColor(.primaryEmerald)
                    }
                }
                .frame(width: 70, height: 70)
            }

            Spacer(minLength: 0)
        }
        .padding(12)
        .containerBackground(Color.backgroundDeep, for: .widget)
    }
}

// MARK: - Medium Widget

struct MediumWidgetView: View {
    let entry: TodoWidgetEntry

    var body: some View {
        HStack(spacing: 16) {
            // Left: Stats
            VStack(alignment: .leading, spacing: 8) {
                Text(entry.date, format: .dateTime.month(.abbreviated).day())
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.textPrimary)

                Spacer()
                
                CategoryCycleButton(currentCategory: entry.currentCategory, compact: true)

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
            .frame(maxWidth: 90)

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
        .containerBackground(Color.backgroundDeep, for: .widget)
    }
}

// MARK: - Large Widget

struct LargeWidgetView: View {
    let entry: TodoWidgetEntry

    // Sort tasks: incomplete first, completed at bottom
    private var sortedTasks: [TaskItem] {
        entry.tasks.sorted { !$0.completed && $1.completed }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text(entry.date, format: .dateTime.weekday(.wide).month(.abbreviated).day())
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.textPrimary)

                Spacer()
                
                CategoryCycleButton(currentCategory: entry.currentCategory)

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
                ForEach(sortedTasks) { task in
                    TaskRowView(task: task, showCategory: entry.currentCategory == nil)
                }

                if entry.tasks.isEmpty {
                    VStack(spacing: 8) {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.largeTitle)
                            .foregroundColor(.primaryEmerald)
                        Text("All caught up!")
                            .font(.headline)
                            .foregroundColor(.textPrimary)
                        Text(entry.currentCategory == nil ? "No pending tasks" : "No tasks in \(entry.currentCategory!.name)")
                            .font(.subheadline)
                            .foregroundColor(.textMuted)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }

                Spacer(minLength: 0)
            }
        }
        .padding()
        .containerBackground(Color.backgroundDeep, for: .widget)
    }
}

// MARK: - Lock Screen Widgets (iOS 16+)

struct AccessoryInlineView: View {
    let entry: TodoWidgetEntry

    var body: some View {
        if entry.totalCount > 0 {
            Label {
                Text("\(entry.completedCount)/\(entry.totalCount) tasks done")
            } icon: {
                Image(systemName: "checkmark.circle.fill")
            }
        } else {
            Label("No tasks", systemImage: "checkmark.seal.fill")
        }
    }
}

struct AccessoryCircularView: View {
    let entry: TodoWidgetEntry

    var body: some View {
        if entry.totalCount > 0 {
            Gauge(value: Double(entry.completedCount), in: 0...Double(entry.totalCount)) {
                Image(systemName: "checkmark.circle.fill")
            } currentValueLabel: {
                Text("\(entry.completedCount)")
                    .font(.system(.body, design: .rounded, weight: .bold))
            }
            .gaugeStyle(.accessoryCircularCapacity)
        } else {
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "checkmark.seal.fill")
                    .font(.title2)
            }
        }
    }
}

struct AccessoryRectangularView: View {
    let entry: TodoWidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            // Header with count
            HStack(spacing: 4) {
                Text(entry.date, format: .dateTime.month(.abbreviated).day())
                    .font(.caption)
                    .fontWeight(.semibold)
                Spacer()
                if entry.totalCount > 0 {
                    Text("\(entry.completedCount)/\(entry.totalCount)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            // Task list or empty state
            if entry.tasks.isEmpty {
                Text("All caught up!")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(entry.tasks.prefix(3)) { task in
                    HStack(spacing: 4) {
                        Image(systemName: task.completed ? "checkmark.circle.fill" : "circle")
                            .font(.caption2)
                            .foregroundStyle(task.completed ? .secondary : .primary)
                        Text(task.title)
                            .font(.caption)
                            .lineLimit(1)
                            .foregroundStyle(task.completed ? .secondary : .primary)
                    }
                }
            }
        }
        .containerBackground(for: .widget) {
            AccessoryWidgetBackground()
        }
    }
}

// MARK: - Task Row

struct TaskRowView: View {
    let task: TaskItem
    var showCategory: Bool = false
    var interactive: Bool = true

    var body: some View {
        HStack(spacing: 8) {
            // Checkbox - interactive or static
            if interactive {
                Button(intent: ToggleTaskIntent(taskId: task.id)) {
                    Image(systemName: task.completed ? "checkmark.circle.fill" : "circle")
                        .foregroundColor(task.completed ? .primaryEmerald : .textMuted)
                        .font(.system(size: 18))
                }
                .buttonStyle(.plain)
            } else {
                Image(systemName: task.completed ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(task.completed ? .primaryEmerald : .textMuted)
                    .font(.system(size: 16))
            }

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
        StaticConfiguration(
            kind: kind,
            provider: TodoWidgetProvider()
        ) { entry in
            TodoWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Todo List")
        .description("View your pending tasks at a glance")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .accessoryInline,
            .accessoryCircular,
            .accessoryRectangular
        ])
    }
}

// MARK: - Preview

#Preview(as: .systemSmall) {
    TodoWidget()
} timeline: {
    TodoWidgetEntry(
        date: .now,
        tasks: [
            TaskItem(id: "1", title: "Buy groceries", completed: false, categoryId: "1", categoryName: "Shopping", categoryColor: "#FFD700", dueDate: nil),
            TaskItem(id: "2", title: "Call dentist", completed: true, categoryId: "2", categoryName: "Health", categoryColor: "#66D99A", dueDate: nil)
        ],
        totalCount: 5,
        completedCount: 2,
        currentCategory: nil
    )
}

#Preview(as: .systemMedium) {
    TodoWidget()
} timeline: {
    TodoWidgetEntry(
        date: .now,
        tasks: [
            TaskItem(id: "1", title: "Buy groceries", completed: false, categoryId: "1", categoryName: "Shopping", categoryColor: "#FFD700", dueDate: nil),
            TaskItem(id: "2", title: "Call dentist", completed: false, categoryId: "2", categoryName: "Health", categoryColor: "#66D99A", dueDate: nil),
            TaskItem(id: "3", title: "Review PRs", completed: true, categoryId: "3", categoryName: "Work", categoryColor: "#66D99A", dueDate: nil)
        ],
        totalCount: 8,
        completedCount: 3,
        currentCategory: CategoryItem(id: "3", name: "Work", color: "#66D99A")
    )
}

// MARK: - Lock Screen Widget Previews

#Preview(as: .accessoryInline) {
    TodoWidget()
} timeline: {
    TodoWidgetEntry(
        date: .now,
        tasks: [],
        totalCount: 5,
        completedCount: 2,
        currentCategory: nil
    )
}

#Preview(as: .accessoryCircular) {
    TodoWidget()
} timeline: {
    TodoWidgetEntry(
        date: .now,
        tasks: [],
        totalCount: 8,
        completedCount: 5,
        currentCategory: nil
    )
}

#Preview(as: .accessoryRectangular) {
    TodoWidget()
} timeline: {
    TodoWidgetEntry(
        date: .now,
        tasks: [
            TaskItem(id: "1", title: "Buy groceries", completed: false, categoryId: nil, categoryName: nil, categoryColor: nil, dueDate: nil),
            TaskItem(id: "2", title: "Call dentist", completed: true, categoryId: nil, categoryName: nil, categoryColor: nil, dueDate: nil)
        ],
        totalCount: 5,
        completedCount: 2,
        currentCategory: nil
    )
}
