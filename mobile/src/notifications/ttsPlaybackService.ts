import { Platform } from 'react-native';
import notifee, { AndroidImportance, AndroidForegroundServiceType } from '@notifee/react-native';
import { Audio } from 'expo-av';

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

// ─── Sessiz "keep-alive" ses döngüsü ───────────────────────────
// expo-speech auto-play'i kelimeler arası setTimeout ile sürüyor; bu sessiz
// boşluklarda iOS "ses üretilmiyor" deyip uygulamayı askıya alır ve zincir
// kopar. Sürekli döngüde çalan sessiz bir track, audio session'ı boşluklarda
// da aktif tutar → uygulama askıya alınmaz → arka planda/ekran kapalıyken
// okuma devam eder. (Android'de asıl işi foreground service yapar; sessiz
// track orada da zararsız ek sigortadır.)
let keepAlive: Audio.Sound | null = null;
let keepAliveStarting = false;

/** Auto-play başlarken çağır — sessiz döngüyü başlatır. */
export async function startSilentKeepAlive(): Promise<void> {
  if (keepAlive || keepAliveStarting) return;
  keepAliveStarting = true;
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/silence.wav'),
      { isLooping: true, volume: 1, shouldPlay: true },
    );
    keepAlive = sound;
  } catch (e) {
    console.warn('Silent keep-alive start failed:', e);
  } finally {
    keepAliveStarting = false;
  }
}

/** Auto-play durunca çağır — sessiz döngüyü durdurur ve belleği boşaltır. */
export async function stopSilentKeepAlive(): Promise<void> {
  const s = keepAlive;
  keepAlive = null;
  if (!s) return;
  try {
    await s.stopAsync();
    await s.unloadAsync();
  } catch (e) {
    console.warn('Silent keep-alive stop failed:', e);
  }
}
