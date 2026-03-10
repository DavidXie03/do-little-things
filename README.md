# Do Little Things

A lightweight daily micro-action app that recommends small tasks each day to help you build positive habits.

Built with **Vue 3 + TypeScript + Vite + Capacitor**, with support for building Android APKs.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Vue 3 + Composition API | Frontend framework |
| TypeScript | Type safety |
| Vite | Build tool |
| Tailwind CSS 4 | Styling |
| Vue Router | Page routing |
| Chart.js + vue-chartjs | Statistics charts |
| Capacitor | Native Android packaging |

---

## Prerequisites

### Basic Requirements

- **Node.js** >= 18
- **npm** >= 9

### Additional Requirements for Android Build

- **JDK** 17+
- **Android SDK** (recommended via [Android Studio](https://developer.android.com/studio))
  - Default SDK paths after installation:
    - macOS: `~/Library/Android/sdk`
    - Linux: `~/Android/Sdk`
    - Windows: `%LOCALAPPDATA%\Android\Sdk`

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type check + production build
npm run build

# Preview build output
npm run preview
```

---

## Build APK

The project includes a one-click build script `build-apk.sh` that automates the entire process from frontend build to APK output.

### Build Pipeline

```
npm install → vite build → cap sync android → gradle assemble → output APK
```

Detailed steps:

1. **Environment check** — Auto-detects Node.js, npm, Java, Android SDK
2. **Install dependencies** — Runs `npm install` if `node_modules` doesn't exist
3. **Frontend build** — Runs `vite build` to generate the `dist/` directory
4. **Capacitor sync** — Syncs frontend assets to the Android native project
5. **Gradle build** — Compiles and generates the APK via Gradle
6. **Export APK** — Copies the APK to the project root directory

### Usage

#### Option 1: Run the script directly

```bash
# Add execute permission (only needed once)
chmod +x build-apk.sh

# Build Debug version (default)
./build-apk.sh

# Build Release version
./build-apk.sh release
```

#### Option 2: npm scripts

```bash
# Debug version
npm run build:apk

# Release version
npm run build:apk:release
```

### Output Files

| Build Type | Output Filename | Description |
|---|---|---|
| debug | `做件小事-debug.apk` | Ready to install for testing, no signing required |
| release | `做件小事-release-YYYYMMDD_HHMMSS.apk` | Unsigned, timestamped, requires manual signing |

The APK is output to the **project root directory**. On macOS, Finder will automatically open the containing folder.

### Troubleshooting

<details>
<summary><b>"Java not found"</b></summary>

Install JDK 17 or later:

```bash
# macOS (Homebrew)
brew install openjdk@17

# Or use the JDK bundled with Android Studio
```
</details>

<details>
<summary><b>"Android SDK not found"</b></summary>

Choose one of the following:

1. Install [Android Studio](https://developer.android.com/studio) — SDK is configured automatically
2. Set the environment variable:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
   ```
3. The script also reads `sdk.dir` from `android/local.properties`
</details>

<details>
<summary><b>Gradle build failure</b></summary>

Try cleaning and rebuilding:

```bash
cd android
./gradlew clean
cd ..
./build-apk.sh
```
</details>

<details>
<summary><b>How to sign a Release APK?</b></summary>

The release build outputs an unsigned APK. Sign it with `apksigner`:

```bash
# Generate a signing key (only needed once)
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key

# Sign the APK
apksigner sign --ks my-release-key.jks --out signed-release.apk 做件小事-release-*.apk
```
</details>

---

## Project Structure

```
do-little-things/
├── src/
│   ├── components/          # Shared components
│   │   ├── icons/           # SVG icon components
│   │   ├── TaskCard.vue     # Card with swipe interaction
│   │   ├── TabBar.vue       # Bottom navigation bar
│   │   ├── TodoItem.vue     # Single todo item row
│   │   └── TodoModal.vue    # Add/edit todo modal
│   ├── views/               # Pages
│   │   ├── HomeView.vue     # Home (daily recommendations)
│   │   └── PendingView.vue  # Todo list
│   ├── composables/         # Composition functions
│   │   ├── storageCore.ts   # Storage load/save/migrate
│   │   ├── useRecords.ts    # Task records management
│   │   ├── useCustomActions.ts # Custom actions CRUD
│   │   ├── useDailyTodos.ts # Daily todo management
│   │   ├── useStorage.ts    # Unified composable entry
│   │   └── useSwipeGesture.ts # Swipe gesture logic
│   ├── services/            # Business logic
│   │   └── taskService.ts
│   ├── types/               # TypeScript type definitions
│   ├── router/              # Router configuration
│   └── data/                # Static data
├── android/                 # Capacitor Android native project
├── build-apk.sh             # One-click build script
├── capacitor.config.ts      # Capacitor configuration
└── package.json
```

---

## License

MIT
