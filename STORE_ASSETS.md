# Store icon and launch asset checklist

Use this before cutting a signed review build. These assets are already checked in and are validated by `npm run release:check`.

## Web / PWA assets

- `assets/icon-192.png`: 192x192 standard PWA icon
- `assets/icon-512.png`: 512x512 standard PWA icon
- `assets/icon-maskable-192.png`: 192x192 maskable PWA icon
- `assets/icon-maskable-512.png`: 512x512 maskable PWA icon
- `assets/apple-touch-icon.png`: 180x180 Apple touch icon
- `manifest.webmanifest`: references standard and maskable icons, standalone display, portrait orientation, and runnerds theme/background colors

## Android assets

- Adaptive icon XML:
  - `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`
  - `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`
- Adaptive icon background:
  - `android/app/src/main/res/values/ic_launcher_background.xml`
- Launcher PNG densities:
  - `mipmap-mdpi`: 48x48 launcher, 108x108 foreground
  - `mipmap-hdpi`: 72x72 launcher, 162x162 foreground
  - `mipmap-xhdpi`: 96x96 launcher, 216x216 foreground
  - `mipmap-xxhdpi`: 144x144 launcher, 324x324 foreground
  - `mipmap-xxxhdpi`: 192x192 launcher, 432x432 foreground

## iOS assets

- `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`: 1024x1024 App Store icon source
- `ios/App/App/Assets.xcassets/Splash.imageset/*.png`: 2732x2732 launch image assets
- `ios/App/App/Base.lproj/LaunchScreen.storyboard`: references the splash asset and dark launch background

## Stop before submission if

- Any icon has the wrong pixel dimensions.
- `manifest.webmanifest` no longer references both standard and maskable 512x512 icons.
- Android adaptive icon XML no longer references `ic_launcher_background` and `ic_launcher_foreground`.
- iOS app icon is not 1024x1024.
- Launch/splash assets show a bright flash or clash with the native status/navigation bar colors.
- The final store console icon differs from the tested native app icon.
