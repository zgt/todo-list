import WidgetKit
import SwiftUI

// MARK: - Calendar Timeline Entry

struct CalendarWidgetEntry: TimelineEntry {
    let date: Date
    let tasks: [TaskItem]
    let totalCount: Int
    let completedCount: Int
}

// MARK: - Calendar Timeline Provider

struct CalendarWidgetProvider: TimelineProvider {
    private let appGroupId = "group.com.zgtf.todolist"

    func placeholder(in context: Context) -> CalendarWidgetEntry {
        CalendarWidgetEntry(date: Date(), tasks: [], totalCount: 0, completedCount: 0)
    }

    func getSnapshot(in context: Context, completion: @escaping (CalendarWidgetEntry) -> Void) {
        let data = loadData()
        completion(CalendarWidgetEntry(date: Date(), tasks: data.tasks, totalCount: data.totalCount, completedCount: data.completedCount))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CalendarWidgetEntry>) -> Void) {
        let data = loadData()
        let entry = CalendarWidgetEntry(date: Date(), tasks: data.tasks, totalCount: data.totalCount, completedCount: data.completedCount)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func loadData() -> WidgetData {
        guard let userDefaults = UserDefaults(suiteName: appGroupId),
              let jsonString = userDefaults.string(forKey: "widgetData"),
              let jsonData = jsonString.data(using: .utf8) else {
            return WidgetData(tasks: [], categories: [], totalCount: 0, completedCount: 0, updatedAt: Date())
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        return (try? decoder.decode(WidgetData.self, from: jsonData))
            ?? WidgetData(tasks: [], categories: [], totalCount: 0, completedCount: 0, updatedAt: Date())
    }
}

// MARK: - Calendar Helpers

private struct CalendarHelpers {
    static let calendar = Calendar.current

    static func startOfWeek(for date: Date) -> Date {
        var cal = Calendar.current
        cal.firstWeekday = 2 // Monday
        let components = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)
        return cal.date(from: components) ?? date
    }

    static func weekDays(for date: Date) -> [Date] {
        let start = startOfWeek(for: date)
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: start) }
    }

    static func monthDates(for date: Date) -> (dates: [Date?], firstWeekday: Int) {
        let components = calendar.dateComponents([.year, .month], from: date)
        guard let firstOfMonth = calendar.date(from: components),
              let range = calendar.range(of: .day, in: .month, for: firstOfMonth) else {
            return ([], 1)
        }

        // Sunday = 1 in Calendar, shift to Monday-based (Mon=0, Sun=6)
        let rawWeekday = calendar.component(.weekday, from: firstOfMonth)
        let mondayBasedOffset = (rawWeekday + 5) % 7

        var dates: [Date?] = Array(repeating: nil, count: mondayBasedOffset)
        for day in range {
            if let d = calendar.date(byAdding: .day, value: day - 1, to: firstOfMonth) {
                dates.append(d)
            }
        }

        // Pad to complete last row
        while dates.count % 7 != 0 {
            dates.append(nil)
        }

        return (dates, mondayBasedOffset)
    }

    static func tasksForDay(_ day: Date, in tasks: [TaskItem]) -> [TaskItem] {
        tasks.filter { task in
            guard let dueDate = task.dueDate else { return false }
            return calendar.isDate(dueDate, inSameDayAs: day)
        }
    }

    static func isToday(_ date: Date) -> Bool {
        calendar.isDateInToday(date)
    }

    static func dayNumber(_ date: Date) -> Int {
        calendar.component(.day, from: date)
    }

    static func timeString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date)
    }
}

// MARK: - Medium Calendar Widget View

struct CalendarMediumView: View {
    let entry: CalendarWidgetEntry

    private var weekDays: [Date] {
        CalendarHelpers.weekDays(for: entry.date)
    }

    private var todayTasks: [TaskItem] {
        CalendarHelpers.tasksForDay(entry.date, in: entry.tasks)
            .filter { !$0.completed }
            .prefix(3)
            .map { $0 }
    }

    private let dayLabels = ["M", "T", "W", "T", "F", "S", "S"]

    var body: some View {
        VStack(spacing: 8) {
            // Date header
            HStack {
                Text(entry.date, format: .dateTime.weekday(.wide).month(.abbreviated).day())
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.textPrimary)
                Spacer()
                if entry.totalCount > 0 {
                    Text("\(entry.completedCount)/\(entry.totalCount)")
                        .font(.caption)
                        .foregroundColor(.primaryEmerald)
                }
            }

            // Week row
            HStack(spacing: 0) {
                ForEach(Array(weekDays.enumerated()), id: \.offset) { index, day in
                    let isToday = CalendarHelpers.isToday(day)
                    let hasTasks = !CalendarHelpers.tasksForDay(day, in: entry.tasks).isEmpty

                    VStack(spacing: 3) {
                        Text(dayLabels[index])
                            .font(.system(size: 9, weight: .medium))
                            .foregroundColor(.textMuted)

                        ZStack {
                            if isToday {
                                Circle()
                                    .fill(Color.primaryEmerald)
                                    .frame(width: 26, height: 26)
                            }

                            Text("\(CalendarHelpers.dayNumber(day))")
                                .font(.system(size: 13, weight: isToday ? .bold : .medium))
                                .foregroundColor(isToday ? .backgroundDeep : .textPrimary)
                        }

                        Circle()
                            .fill(hasTasks ? Color.primaryEmerald : Color.clear)
                            .frame(width: 4, height: 4)
                    }
                    .frame(maxWidth: .infinity)
                }
            }

            Divider().background(Color.borderDefault)

            // Today's tasks
            if todayTasks.isEmpty {
                Text("No tasks today")
                    .font(.caption)
                    .foregroundColor(.textMuted)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(todayTasks) { task in
                        CalendarTaskRow(task: task)
                    }
                }
            }

            Spacer(minLength: 0)
        }
        .padding()
        .containerBackground(Color.backgroundDeep, for: .widget)
    }
}

// MARK: - Large Calendar Widget View

struct CalendarLargeView: View {
    let entry: CalendarWidgetEntry

    private var monthData: (dates: [Date?], firstWeekday: Int) {
        CalendarHelpers.monthDates(for: entry.date)
    }

    private var todayTasks: [TaskItem] {
        CalendarHelpers.tasksForDay(entry.date, in: entry.tasks)
            .filter { !$0.completed }
            .prefix(5)
            .map { $0 }
    }

    private let weekdayHeaders = ["M", "T", "W", "T", "F", "S", "S"]

    var body: some View {
        VStack(spacing: 8) {
            // Month header
            HStack {
                Text(entry.date, format: .dateTime.month(.wide).year())
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.textPrimary)
                Spacer()
                if entry.totalCount > 0 {
                    Text("\(entry.completedCount)/\(entry.totalCount)")
                        .font(.caption)
                        .foregroundColor(.primaryEmerald)
                }
            }

            // Weekday headers
            HStack(spacing: 0) {
                ForEach(weekdayHeaders, id: \.self) { day in
                    Text(day)
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.textMuted)
                        .frame(maxWidth: .infinity)
                }
            }

            // Calendar grid
            let dates = monthData.dates
            let rows = stride(from: 0, to: dates.count, by: 7).map { Array(dates[$0..<min($0+7, dates.count)]) }

            VStack(spacing: 2) {
                ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                    HStack(spacing: 0) {
                        ForEach(0..<7, id: \.self) { col in
                            if col < row.count, let day = row[col] {
                                CalendarDayCell(
                                    day: day,
                                    isToday: CalendarHelpers.isToday(day),
                                    tasks: CalendarHelpers.tasksForDay(day, in: entry.tasks)
                                )
                            } else {
                                Color.clear.frame(maxWidth: .infinity, minHeight: 22)
                            }
                        }
                    }
                }
            }

            Divider().background(Color.borderDefault)

            // Today's tasks
            HStack {
                Text("Today")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.primaryEmerald)
                Spacer()
            }

            if todayTasks.isEmpty {
                Text("No tasks today")
                    .font(.caption)
                    .foregroundColor(.textMuted)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(todayTasks) { task in
                        CalendarTaskRow(task: task)
                    }
                }
            }

            Spacer(minLength: 0)
        }
        .padding()
        .containerBackground(Color.backgroundDeep, for: .widget)
    }
}

// MARK: - Calendar Day Cell

struct CalendarDayCell: View {
    let day: Date
    let isToday: Bool
    let tasks: [TaskItem]

    var body: some View {
        VStack(spacing: 1) {
            ZStack {
                if isToday {
                    Circle()
                        .fill(Color.primaryEmerald)
                        .frame(width: 20, height: 20)
                }

                Text("\(CalendarHelpers.dayNumber(day))")
                    .font(.system(size: 11, weight: isToday ? .bold : .regular))
                    .foregroundColor(isToday ? .backgroundDeep : .textPrimary)
            }

            if !tasks.isEmpty {
                HStack(spacing: 2) {
                    ForEach(Array(tasks.prefix(3).enumerated()), id: \.offset) { _, task in
                        Circle()
                            .fill(dotColor(for: task))
                            .frame(width: 3, height: 3)
                    }
                }
                .frame(height: 4)
            } else {
                Spacer().frame(height: 4)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 22)
    }

    private func dotColor(for task: TaskItem) -> Color {
        if let hex = task.categoryColor {
            return Color(hex: hex)
        }
        return .primaryEmerald
    }
}

// MARK: - Calendar Task Row

struct CalendarTaskRow: View {
    let task: TaskItem

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(categoryColor)
                .frame(width: 6, height: 6)

            Text(task.title)
                .font(.caption)
                .foregroundColor(.textPrimary)
                .lineLimit(1)

            Spacer()

            if let dueDate = task.dueDate {
                Text(CalendarHelpers.timeString(dueDate))
                    .font(.system(size: 10))
                    .foregroundColor(.textMuted)
            }
        }
    }

    private var categoryColor: Color {
        if let hex = task.categoryColor {
            return Color(hex: hex)
        }
        return .primaryEmerald
    }
}

// MARK: - Medium Calendar Widget

struct CalendarMediumWidget: Widget {
    let kind: String = "CalendarMediumWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CalendarWidgetProvider()) { entry in
            CalendarMediumView(entry: entry)
        }
        .configurationDisplayName("Calendar Week")
        .description("View your week at a glance with task indicators")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Large Calendar Widget

struct CalendarLargeWidget: Widget {
    let kind: String = "CalendarLargeWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CalendarWidgetProvider()) { entry in
            CalendarLargeView(entry: entry)
        }
        .configurationDisplayName("Calendar Month")
        .description("View your month with task indicators and today's tasks")
        .supportedFamilies([.systemLarge])
    }
}

// MARK: - Previews

#Preview(as: .systemMedium) {
    CalendarMediumWidget()
} timeline: {
    CalendarWidgetEntry(
        date: .now,
        tasks: [
            TaskItem(id: "1", title: "Team standup", completed: false, categoryId: "1", categoryName: "Work", categoryColor: "#66D99A", dueDate: Date()),
            TaskItem(id: "2", title: "Buy groceries", completed: false, categoryId: "2", categoryName: "Personal", categoryColor: "#FFD700", dueDate: Date()),
            TaskItem(id: "3", title: "Review PRs", completed: false, categoryId: "1", categoryName: "Work", categoryColor: "#66D99A", dueDate: Calendar.current.date(byAdding: .day, value: 2, to: Date()))
        ],
        totalCount: 5,
        completedCount: 1
    )
}

#Preview(as: .systemLarge) {
    CalendarLargeWidget()
} timeline: {
    CalendarWidgetEntry(
        date: .now,
        tasks: [
            TaskItem(id: "1", title: "Team standup", completed: false, categoryId: "1", categoryName: "Work", categoryColor: "#66D99A", dueDate: Date()),
            TaskItem(id: "2", title: "Buy groceries", completed: false, categoryId: "2", categoryName: "Personal", categoryColor: "#FFD700", dueDate: Date()),
            TaskItem(id: "3", title: "Review PRs", completed: false, categoryId: "1", categoryName: "Work", categoryColor: "#66D99A", dueDate: Calendar.current.date(byAdding: .day, value: 2, to: Date())),
            TaskItem(id: "4", title: "Dentist appointment", completed: false, categoryId: "2", categoryName: "Personal", categoryColor: "#FFD700", dueDate: Calendar.current.date(byAdding: .day, value: 5, to: Date()))
        ],
        totalCount: 8,
        completedCount: 3
    )
}
