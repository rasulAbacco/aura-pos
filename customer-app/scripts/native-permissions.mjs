/**
 * Native project setup for the customer app. Run once after `npx cap add android` / `npx cap add ios`:
 *   npm run native:permissions
 *  - location permission ("Use my current location" → distance to salons)
 *  - Android 12+ system splash: brand cream background instead of white (icon = app icon)
 * Safe to run again: it only adds what is missing.
 */
import fs from "node:fs";

const manifest = "android/app/src/main/AndroidManifest.xml";
if (fs.existsSync(manifest)) {
  let xml = fs.readFileSync(manifest, "utf8");
  const lines = [
    '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
    '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
    '<uses-feature android:name="android.hardware.location.gps" android:required="false" />',
  ].filter((l) => !xml.includes(l.split('"')[1]));
  if (lines.length) {
    xml = xml.replace(
      "</manifest>",
      `    ${lines.join("\n    ")}\n</manifest>`,
    );
    fs.writeFileSync(manifest, xml);
    console.log("Android: location permission added");
  } else console.log("Android: already set");
  const styles = "android/app/src/main/res/values/styles.xml";
  if (fs.existsSync(styles)) {
    let st = fs.readFileSync(styles, "utf8");
    if (!st.includes("windowSplashScreenBackground")) {
      st = st.replace(
        /(<style name="AppTheme\.NoActionBarLaunch"[^>]*>)/,
        '$1\n        <item name="windowSplashScreenBackground">#fbf5f2</item>',
      );
      fs.writeFileSync(styles, st);
      console.log("Android: splash background set to brand cream");
    }
  }
} else
  console.log(
    "Android project not found (run `npx cap add android` first) — skipped",
  );

const plist = "ios/App/App/Info.plist";
if (fs.existsSync(plist)) {
  let x = fs.readFileSync(plist, "utf8");
  if (!x.includes("NSLocationWhenInUseUsageDescription")) {
    const i = x.lastIndexOf("</dict>");
    x = `${x.slice(
      0,
      i,
    )}\t<key>NSLocationWhenInUseUsageDescription</key>\n\t<string>Used to show how far salons and shops are from you.</string>\n${x.slice(
      i,
    )}`;
    fs.writeFileSync(plist, x);
    console.log("iOS: location permission text added");
  } else console.log("iOS: already set");
} else
  console.log(
    "iOS project not found (run `npx cap add ios` on a Mac first) — skipped",
  );
