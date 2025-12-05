# HTML to Design

A lightweight, offline HTML-to-Design converter with screenshot capture.

## Features

- 🎨 Convert HTML/CSS to design-tree JSON
- 📷 Capture full-page or viewport screenshots
- 🖥️ Clean local web interface
- ⚡ Fast startup, minimal dependencies (~5MB)
- 🌐 Works with any Chromium-based browser

## Requirements

- **Node.js** 18 or higher
- **Any Chromium-based browser** (one of the following):
  - Google Chrome
  - Microsoft Edge
  - Brave
  - Vivaldi
  - Opera
  - Chromium
  - Arc
  - And more...

## Installation

```bash
# Install dependencies
npm install
```

## Running the Project

```bash
# Start the server
npm start
```

Open your browser and go to: **http://localhost:3000**

## How to Use

1. **Enter a URL** in the input field
2. Click **Fetch** to download the HTML
3. Click **Capture Screenshot** to take a screenshot
4. Click **Convert to Design** to generate the design tree JSON
5. View results in the tabs: Screenshot, Design Tree, Colors

## Configuration

### Custom Port

```bash
# Use a different port
PORT=8080 npm start
```

### Custom Browser Path

If the tool can't find your browser automatically:

```bash
# Windows (PowerShell)
$env:BROWSER_PATH = "C:\Path\To\browser.exe"
npm start

# macOS/Linux
BROWSER_PATH="/path/to/browser" npm start
```

## Supported Browsers

The tool automatically detects and uses any installed Chromium-based browser:

| Browser | Windows | macOS | Linux |
|---------|---------|-------|-------|
| Google Chrome | ✅ | ✅ | ✅ |
| Microsoft Edge | ✅ | ✅ | ✅ |
| Brave | ✅ | ✅ | ✅ |
| Vivaldi | ✅ | ✅ | ✅ |
| Opera / Opera GX | ✅ | ✅ | ✅ |
| Chromium | ✅ | ✅ | ✅ |
| Arc | ✅ | ✅ | - |
| Yandex Browser | ✅ | - | - |
| Naver Whale | ✅ | - | - |

## Troubleshooting

### "No Chromium-based browser found"

Install any of the supported browsers listed above, or set the `BROWSER_PATH` environment variable to point to your browser executable.

### "Address already in use"

The port is already occupied. Either:
1. Stop the other process using port 3000
2. Use a different port: `PORT=8080 npm start`

### Screenshots not working

Make sure your browser is up to date. The tool requires a Chromium-based browser (Firefox and Safari are not supported).

## License

MIT
