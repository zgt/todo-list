const { withXcodeProject } = require("expo/config-plugins");

/**
 * Syncs CURRENT_PROJECT_VERSION from the main app target to
 * all widget extension targets so iOS doesn't reject the bundle.
 *
 * Also reads ios.buildNumber from Expo config as a fallback,
 * ensuring EAS-managed version bumps propagate to extensions.
 */
const withSyncWidgetVersion = (config) => {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const configs = project.pbxXCBuildConfigurationSection();

    // Prefer the Expo config buildNumber (set by EAS before plugins run)
    const expoBuildNumber = cfg.ios?.buildNumber;

    // Find the main app's CURRENT_PROJECT_VERSION from a Release config
    let mainVersion = null;
    for (const key of Object.keys(configs)) {
      const entry = configs[key];
      if (
        typeof entry === "object" &&
        entry.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER ===
          '"com.zgtf.todolist"' &&
        entry.name === "Release"
      ) {
        mainVersion = String(
          entry.buildSettings.CURRENT_PROJECT_VERSION ?? "1",
        ).replace(/"/g, "");
        break;
      }
    }

    // Use Expo buildNumber if available (EAS sets this before config plugins)
    const version = expoBuildNumber || mainVersion || "1";

    // Apply to ALL build configurations for widget extension targets
    for (const key of Object.keys(configs)) {
      const entry = configs[key];
      if (
        typeof entry === "object" &&
        entry.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER?.includes(
          "com.zgtf.todolist.",
        )
      ) {
        entry.buildSettings.CURRENT_PROJECT_VERSION = `"${version}"`;
      }
    }

    // Also sync the main app target to ensure consistency
    for (const key of Object.keys(configs)) {
      const entry = configs[key];
      if (
        typeof entry === "object" &&
        entry.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER ===
          '"com.zgtf.todolist"'
      ) {
        entry.buildSettings.CURRENT_PROJECT_VERSION = `"${version}"`;
      }
    }

    // Set CURRENT_PROJECT_VERSION at the project level so all targets
    // inherit it by default (fixes extension mismatch when target-level
    // settings use $(CURRENT_PROJECT_VERSION) or are not explicitly set)
    const pbxProject = project.pbxProjectSection();
    for (const key of Object.keys(pbxProject)) {
      const entry = pbxProject[key];
      if (typeof entry === "object" && entry.buildConfigurationList) {
        const configListId = entry.buildConfigurationList;
        const configList =
          project.pbxXCConfigurationList()[configListId];
        if (configList?.buildConfigurations) {
          for (const ref of configList.buildConfigurations) {
            const buildConfig = configs[ref.value];
            if (buildConfig?.buildSettings) {
              buildConfig.buildSettings.CURRENT_PROJECT_VERSION =
                `"${version}"`;
            }
          }
        }
      }
    }

    return cfg;
  });
};

module.exports = withSyncWidgetVersion;
