/**
 * Phone-app (Capacitor) specifics. In a browser every helper falls back to web behaviour.
 * The refresh token lives in the app's private storage (the WebView can't use the HttpOnly cookie
 * across sites); on the web it is an HttpOnly cookie the page never sees.
 */
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();

const RT_KEY = 'sg.customer.refreshToken';
let rtCache;
export async function getRefreshToken() {
  if (!isNative) return null;
  if (rtCache !== undefined) return rtCache;
  const { Preferences } = await import('@capacitor/preferences');
  rtCache = (await Preferences.get({ key: RT_KEY })).value ?? null;
  return rtCache;
}
export async function setRefreshToken(token) {
  if (!isNative) return;
  rtCache = token ?? null;
  const { Preferences } = await import('@capacitor/preferences');
  if (token) await Preferences.set({ key: RT_KEY, value: token });
  else await Preferences.remove({ key: RT_KEY });
}

/** Android back button goes back in the app (or closes an open sheet), status bar colour, hide splash. */
export async function initNativeShell() {
  if (!isNative) return;
  document.documentElement.classList.add('is-native', `is-${platform}`);
  const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([import('@capacitor/app'), import('@capacitor/status-bar'), import('@capacitor/splash-screen')]);
  App.addListener('backButton', ({ canGoBack }) => {
    if (document.querySelector('[role="dialog"]')) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return; }
    if (canGoBack && window.location.pathname !== '/') window.history.back(); else App.exitApp();
  });
  // Coming back to the app: refresh lists (booking confirmed while the app was in the background).
  App.addListener('resume', () => window.dispatchEvent(new Event('sg:refresh')));
  await StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  await StatusBar.setBackgroundColor({ color: '#fbf5f2' }).catch(() => {});
  await SplashScreen.hide().catch(() => {});
}
