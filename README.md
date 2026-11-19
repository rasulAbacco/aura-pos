# Salora Glam update — shop, photos, location, hours, booking alert: files to copy

Unzip over your project folder (same paths). **Create** = new file, **Update** = replace your copy. Nothing to delete.

## After copying

```bash
cd server && npm run db:migrate      # product details, photos table, branch latitude/longitude (safe to re-run)
cd ../client && npm run build         # salon app (web)
npm run build:android                 # salon Android app: adds location + camera permissions
cd ../customer-app && npm run build   # customer website
```

Customer phone apps: after `npx cap add android` / `npx cap add ios`, run `npm run native:permissions` in `customer-app/` once.

No new server environment variables.

## Create (17 files)

| Path |
|---|
| `client/src/components/media/PhotoManager.jsx` |
| `client/src/features/settings/components/BranchHours.jsx` |
| `client/src/layouts/app/components/RequestAlerts.jsx` |
| `client/src/lib/alertSound.js` |
| `client/src/lib/imageResize.js` |
| `customer-app/scripts/native-permissions.mjs` |
| `customer-app/src/components/Gallery.jsx` |
| `customer-app/src/components/ProductCard.jsx` |
| `customer-app/src/components/TopNav.jsx` |
| `customer-app/src/lib/location.jsx` |
| `customer-app/src/lib/media.js` |
| `customer-app/src/pages/ProductPage.jsx` |
| `customer-app/src/pages/ShopPage.jsx` |
| `server/prisma/migrations/20261119000000_shop_media_location/migration.sql` |
| `server/src/features/media/media.routes.js` |
| `server/src/features/media/media.service.js` |
| `server/tests/integration/shop-media.test.js` |

## Update (41 files)

| Path |
|---|
| `client/android/app/src/main/AndroidManifest.xml` |
| `client/ios/App/App/Info.plist` |
| `client/src/features/catalog/CatalogPage.jsx` |
| `client/src/features/catalog/components/CatalogTable.jsx` |
| `client/src/features/catalog/components/ItemModal.jsx` |
| `client/src/features/dashboard/DashboardPage.jsx` |
| `client/src/features/online/OnlinePage.jsx` |
| `client/src/features/settings/SettingsPage.jsx` |
| `client/src/features/settings/components/CustomerAppSettings.jsx` |
| `client/src/layouts/app/AppLayout.jsx` |
| `client/src/layouts/app/components/SidebarNav.jsx` |
| `client/src/layouts/app/navItems.js` |
| `customer-app/README.md` |
| `customer-app/package.json` |
| `customer-app/src/App.jsx` |
| `customer-app/src/components/SalonCard.jsx` |
| `customer-app/src/components/TabBar.jsx` |
| `customer-app/src/components/ui.jsx` |
| `customer-app/src/index.css` |
| `customer-app/src/lib/cart.jsx` |
| `customer-app/src/main.jsx` |
| `customer-app/src/pages/BookPage.jsx` |
| `customer-app/src/pages/BookingsPage.jsx` |
| `customer-app/src/pages/CartPage.jsx` |
| `customer-app/src/pages/HomePage.jsx` |
| `customer-app/src/pages/LoginPage.jsx` |
| `customer-app/src/pages/OrdersPage.jsx` |
| `customer-app/src/pages/ProfilePage.jsx` |
| `customer-app/src/pages/SalonPage.jsx` |
| `server/prisma/schema.prisma` |
| `server/src/app.js` |
| `server/src/features/catalog/catalog.service.js` |
| `server/src/features/catalog/catalog.validation.js` |
| `server/src/features/customer-app/customer.routes.js` |
| `server/src/features/customer-app/customer.service.js` |
| `server/src/features/online/online.routes.js` |
| `server/src/features/online/online.service.js` |
| `server/src/features/settings/settings.service.js` |
| `server/src/features/settings/settings.validation.js` |
| `server/src/features/users/users.permissions.js` |
| `server/tests/integration/customer-app.test.js` |
