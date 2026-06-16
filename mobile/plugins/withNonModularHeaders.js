const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Fixes the react-native-firebase + `useFrameworks: "static"` iOS build error:
 *   "include of non-modular header inside framework module 'RNFBApp...'
 *    [-Werror,-Wnon-modular-include-in-framework-module]"
 *
 * Injects CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES into the
 * Podfile post_install so the React-Core headers can be imported from the
 * Firebase static framework modules.
 */
const ANCHOR = 'post_install do |installer|';
const MARKER = 'CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES';
const INJECT = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_configuration|
        build_configuration.build_settings['${MARKER}'] = 'YES'
      end
    end`;

module.exports = function withNonModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (!contents.includes(MARKER) && contents.includes(ANCHOR)) {
        contents = contents.replace(ANCHOR, `${ANCHOR}\n${INJECT}\n`);
        fs.writeFileSync(podfilePath, contents);
      }
      return cfg;
    },
  ]);
};
