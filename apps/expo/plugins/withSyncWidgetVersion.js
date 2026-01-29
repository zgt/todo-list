const { withXcodeProject } = require("expo/config-plugins");

/**
 * Syncs CURRENT_PROJECT_VERSION from the main app target to
 * all widget extension targets so iOS doesn't reject the bundle.
 */
const withSyncWidgetVersion = (config) => {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const configs = project.pbxXCBuildConfigurationSection();

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
        mainVersion =
          entry.buildSettings.CURRENT_PROJECT_VERSION?.replace(/"/g, "") ?? "1";
        break;
      }
    }

    if (!mainVersion) return cfg;

    // Apply to all widget extension targets
    for (const key of Object.keys(configs)) {
      const entry = configs[key];
      if (
        typeof entry === "object" &&
        entry.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER?.includes(
          "com.zgtf.todolist.",
        )
      ) {
        entry.buildSettings.CURRENT_PROJECT_VERSION = `"${mainVersion}"`;
      }
    }

    return cfg;
  });
};

module.exports = withSyncWidgetVersion;
