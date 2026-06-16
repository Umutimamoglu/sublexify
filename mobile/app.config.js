// Extends app.json. Because google-services.json / GoogleService-Info.plist are
// gitignored (public repo), EAS cloud builds receive them as "file" env vars.
// Locally the env vars are unset and we fall back to the on-disk files.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? config.android.googleServicesFile,
  },
  ios: {
    ...config.ios,
    googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? config.ios.googleServicesFile,
  },
});
