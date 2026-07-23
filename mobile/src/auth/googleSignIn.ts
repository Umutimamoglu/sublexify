import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';

/**
 * Google sign-in. The provider hands us an ID token on the device; the backend
 * verifies it and returns our own JWT — the Google token itself is never
 * trusted locally and never stored.
 *
 * `webClientId` is what makes Google mint an ID token our server will accept:
 * on both platforms the token's audience is that client, which is the one the
 * backend's GOOGLE_CLIENT_IDS allow-list is built around.
 */
const WEB_CLIENT_ID =
  '1053185645423-mnt5n0438iqjufb396h4bsh14o1i894q.apps.googleusercontent.com';
const IOS_CLIENT_ID =
  '1053185645423-0pqc5ukku7qsqchs2jj9bnlgaplp563o.apps.googleusercontent.com';

let configured = false;

export function configureGoogleSignIn() {
  if (configured) return;
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    offlineAccess: false,
  });
  configured = true;
}

/** Raised when the user backs out of the account picker — not an error to show. */
export class GoogleSignInCancelled extends Error {}

export async function signInWithGoogle() {
  configureGoogleSignIn();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();

    // v13+ returns a discriminated union; older shapes put the token at the root.
    const idToken =
      (result as any)?.data?.idToken ?? (result as any)?.idToken ?? null;

    if ((result as any)?.type === 'cancelled' || !idToken) {
      throw new GoogleSignInCancelled();
    }

    const res = await apiClient.post(ENDPOINTS.auth.social, {
      provider: 'GOOGLE',
      token: idToken,
    });
    return res.data as { token: string; user: any };
  } catch (err: any) {
    if (err instanceof GoogleSignInCancelled) throw err;
    if (
      err?.code === statusCodes.SIGN_IN_CANCELLED ||
      err?.code === statusCodes.IN_PROGRESS
    ) {
      throw new GoogleSignInCancelled();
    }
    throw err;
  }
}

/** Clears the cached Google account so the next sign-in shows the picker. */
export async function signOutFromGoogle() {
  try {
    configureGoogleSignIn();
    await GoogleSignin.signOut();
  } catch {
    // Signing out of Google is best-effort; our own session is already cleared.
  }
}
