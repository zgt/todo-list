const {
  withXcodeProject,
  withDangerousMod,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Two-pronged approach to sync CFBundleVersion between parent app and widget:
 *
 * 1. Config plugin phase: sync CURRENT_PROJECT_VERSION across all targets
 *    in the Xcode project (works when the version is known at prebuild time).
 *
 * 2. Xcode build phase script: at actual build time, read the parent app's
 *    Info.plist CFBundleVersion and write it into the widget's Info.plist.
 *    This catches the case where EAS sets the build number AFTER plugins run
 *    (appVersionSource: "remote" + autoIncrement).
 */

const DEBUG = true;
const log = (...args) =>
  DEBUG && console.log("[withSyncWidgetVersion]", ...args);

/**
 * Phase 1: Sync CURRENT_PROJECT_VERSION in Xcode project build settings.
 * This handles the simple case and provides debug visibility.
 */
function syncBuildSettings(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const configs = project.pbxXCBuildConfigurationSection();

    log("=== START: Build Settings Sync ===");

    const expoBuildNumber = cfg.ios?.buildNumber;
    log(
      "cfg.ios?.buildNumber (from Expo/EAS):",
      expoBuildNumber ?? "(undefined)",
    );

    // Log all configs before changes
    log("--- All Build Configurations ---");
    for (const key of Object.keys(configs)) {
      const entry = configs[key];
      if (typeof entry === "object" && entry.buildSettings) {
        const bundleId = entry.buildSettings.PRODUCT_BUNDLE_IDENTIFIER;
        const curVer = entry.buildSettings.CURRENT_PROJECT_VERSION;
        if (bundleId) {
          log(
            `  [${entry.name}] ${bundleId} → CURRENT_PROJECT_VERSION = ${curVer ?? "(not set)"}`,
          );
        }
      }
    }

    // Find main app version from Release config
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

    log("mainVersion (from Release config):", mainVersion);

    const version = expoBuildNumber || mainVersion || "1";
    log("Resolved version to apply:", version);

    // Apply to widget extension targets
    let widgetConfigsUpdated = 0;
    for (const key of Object.keys(configs)) {
      const entry = configs[key];
      if (
        typeof entry === "object" &&
        entry.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER?.includes(
          "com.zgtf.todolist.",
        )
      ) {
        entry.buildSettings.CURRENT_PROJECT_VERSION = `"${version}"`;
        widgetConfigsUpdated++;
      }
    }
    log(`Updated ${widgetConfigsUpdated} widget build configurations`);

    // Sync main app target
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

    // Sync project-level configs
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

    log("=== END: Build Settings Sync ===");
    return cfg;
  });
}

/**
 * Phase 2: Add an Xcode build phase script to the main app target that
 * copies CFBundleVersion from the parent app's Info.plist into the widget's
 * Info.plist at build time. This runs AFTER EAS/Xcode sets the final version.
 */
function addBuildPhaseScript(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;

    const shellScript = [
      "PARENT_PLIST=${BUILT_PRODUCTS_DIR}/Tokilist.app/Info.plist",
      "WIDGET_PLIST=${BUILT_PRODUCTS_DIR}/Tokilist.app/PlugIns/TokilistWidgets.appex/Info.plist",
      "if [ -f ${PARENT_PLIST} ] && [ -f ${WIDGET_PLIST} ]; then",
      "  PARENT_VERSION=$(/usr/libexec/PlistBuddy -c \"Print :CFBundleVersion\" ${PARENT_PLIST})",
      "  WIDGET_VERSION=$(/usr/libexec/PlistBuddy -c \"Print :CFBundleVersion\" ${WIDGET_PLIST})",
      "  echo \"[SyncWidgetVersion] Parent: $PARENT_VERSION Widget: $WIDGET_VERSION\"",
      "  if [ \"$PARENT_VERSION\" != \"$WIDGET_VERSION\" ]; then",
      "    /usr/libexec/PlistBuddy -c \"Set :CFBundleVersion $PARENT_VERSION\" ${WIDGET_PLIST}",
      "    echo \"[SyncWidgetVersion] Updated widget to $PARENT_VERSION\"",
      "  fi",
      "else",
      "  echo \"[SyncWidgetVersion] WARNING: plist files not found\"",
      "fi",
    ].join("\\n");

    // Find the main app target
    const mainTarget = project.getFirstTarget();
    if (mainTarget) {
      project.addBuildPhase(
        [],
        "PBXShellScriptBuildPhase",
        "Sync Widget CFBundleVersion",
        mainTarget.uuid,
        { shellPath: "/bin/sh", shellScript },
      );
      log("Added build phase script: Sync Widget CFBundleVersion");
    } else {
      log("WARNING: Could not find main app target to add build phase");
    }

    return cfg;
  });
}

const withSyncWidgetVersion = (config) => {
  config = syncBuildSettings(config);
  config = addBuildPhaseScript(config);
  return config;
};

module.exports = withSyncWidgetVersion;
