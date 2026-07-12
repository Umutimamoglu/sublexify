import { Platform } from 'react-native';
import notifee, { AndroidImportance, AndroidForegroundServiceType } from '@notifee/react-native';

/**
 * Android: auto-play TTS sırasında foreground service çalıştırır.
 *
 * Ekran kapandığında / uygulama arka plana atıldığında Android, JS timer'larını
 * kısıp süreci öldürebilir; foreground service (mediaPlayback tipli) süreci
 * canlı tutar ve kullanıcıya kalıcı bir "sesli çalışma" bildirimi gösterir.
 * iOS'ta gerek yok — UIBackgroundModes: ["audio"] + aktif audio session yeterli.
 *
 * registerForegroundService MODÜL SCOPE'unda, uygulama başlarken bir kez
 * çağrılmalıdır (notifee şartı) — bu dosya background.ts'ten import edilir.
 */

const NOTIFICATION_ID = 'tts-autoplay';

let resolveService: (() => void) | null = null;
let running = false;

if (Platform.OS === 'android') {
  // Promise pending kaldığı sürece servis yaşar; stopTtsPlaybackService çözer.
  notifee.registerForegroundService(() => {
    return new Promise<void>((resolve) => {
      resolveService = resolve;
    });
  });
}

async function ensureChannel(): Promise<string> {
  return notifee.createChannel({
    id: 'tts-playback',
    name: 'Sesli Çalışma',
    importance: AndroidImportance.LOW, // sessiz, kalıcı medya bildirimi
    vibration: false,
  });
}

/** Auto-play başlarken çağır (Android dışında no-op). */
export async function startTtsPlaybackService(title: string, body: string): Promise<void> {
  if (Platform.OS !== 'android' || running) return;
  running = true;
  try {
    const channelId = await ensureChannel();
    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title,
      body,
      android: {
        channelId,
        asForegroundService: true,
        foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK],
        ongoing: true,
        onlyAlertOnce: true,
        pressAction: { id: 'default' },
      },
    });
  } catch (e) {
    running = false;
    console.warn('TTS foreground service start failed:', e);
  }
}

/** Auto-play durunca çağır (Android dışında no-op). */
export async function stopTtsPlaybackService(): Promise<void> {
  if (Platform.OS !== 'android' || !running) return;
  running = false;
  try {
    await notifee.stopForegroundService();
    resolveService?.();
    resolveService = null;
    await notifee.cancelNotification(NOTIFICATION_ID);
  } catch (e) {
    console.warn('TTS foreground service stop failed:', e);
  }
}
