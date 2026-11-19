/**
 * Adds the location permission ("Use my current location" → distance to salons) to the native projects.
 * Run once after `npx cap add android` / `npx cap add ios`:  npm run native:permissions
 * Safe to run again: it only adds what is missing.
 */
import fs from 'node:fs';

const manifest = 'android/app/src/main/AndroidManifest.xml';
if (fs.existsSync(manifest)) {
  let xml = fs.readFileSync(manifest, 'utf8');
  const lines = [
    '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
    '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
    '<uses-feature android:name="android.hardware.location.gps" android:required="false" />',
  ].filter((l) => !xml.includes(l.split('"')[1]));
  if (lines.length) {
    xml = xml.replace('</manifest>', `    ${lines.join('\n    ')}\n</manifest>`);
    fs.writeFileSync(manifest, xml);
    console.log('Android: location permission added');
  } else console.log('Android: already set');
} else console.log('Android project not found (run `npx cap add android` first) — skipped');

const plist = 'ios/App/App/Info.plist';
if (fs.existsSync(plist)) {
  let x = fs.readFileSync(plist, 'utf8');
  if (!x.includes('NSLocationWhenInUseUsageDescription')) {
    const i = x.lastIndexOf('</dict>');
    x = `${x.slice(0, i)}\t<key>NSLocationWhenInUseUsageDescription</key>\n\t<string>Used to show how far salons and shops are from you.</string>\n${x.slice(i)}`;
    fs.writeFileSync(plist, x);
    console.log('iOS: location permission text added');
  } else console.log('iOS: already set');
} else console.log('iOS project not found (run `npx cap add ios` on a Mac first) — skipped');
