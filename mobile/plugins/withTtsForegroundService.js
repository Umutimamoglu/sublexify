const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

/**
 * Auto-play TTS'in ekran kapalıyken / arka planda devam edebilmesi için
 * notifee foreground service'ini "mediaPlayback" tipiyle çalıştırır.
 *
 * Android 14 (API 34)+ foreground service başlatırken tipin hem manifest'te
 * hem de runtime'da (notifee `foregroundServiceTypes`) bildirilmesini zorunlu
 * kılar. Notifee'nin kendi manifest'i tip belirtmediği için burada
 * tools:replace ile override ediyoruz.
 */
module.exports = function withTtsForegroundService(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;

    // tools namespace (tools:replace için gerekli)
    manifest.$ = manifest.$ || {};
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    AndroidConfig.Permissions.ensurePermissions(mod.modResults, [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
    ]);

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    app.service = app.service || [];

    const SERVICE_NAME = 'app.notifee.core.ForegroundService';
    let service = app.service.find((s) => s.$?.['android:name'] === SERVICE_NAME);
    if (!service) {
      service = { $: { 'android:name': SERVICE_NAME } };
      app.service.push(service);
    }
    service.$['android:foregroundServiceType'] = 'mediaPlayback';
    service.$['tools:replace'] = 'android:foregroundServiceType';

    return mod;
  });
};
