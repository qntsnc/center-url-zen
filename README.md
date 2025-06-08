# Center URL Mod for Zen Browser

This mod centers the URL bar in Zen Browser and displays only the domain name instead of the full URL.

![Demo Image](https://raw.githubusercontent.com/USERNAME/center-url-mod/main/demo.png)

## Features

- Displays only the main domain name in the URL bar (example.com instead of https://sub.example.com/page?query=value)
- Simplifies subdomains (sub.example.com → example.com)
- Properly handles country-specific domains (example.co.uk)
- Centers the domain text for better visibility
- Truncates very long domain names
- Updates automatically when changing tabs or navigating to different URLs
- Maintains full URL bar functionality

## Installation

### Method 1: Using Sine Extension (recommended)

1. Install the Sine extension for Zen Browser
2. Import this mod from GitHub
3. Enable the mod

### Method 2: Direct Installation

1. Open Zen Browser's theme manager
2. Click "Install from GitHub"
3. Enter: `USERNAME/center-url-mod`
4. Click Install

### Method 3: Manual Installation

1. Download this repository as a ZIP file
2. Extract the contents to your Zen Browser profile folder
   - Windows: `%APPDATA%\zen\Profiles\YOUR_PROFILE\chrome\`
   - macOS: `~/Library/Application Support/zen/Profiles/YOUR_PROFILE/chrome/`
   - Linux: `~/.zen/Profiles/YOUR_PROFILE/chrome/`
3. Restart Zen Browser

## Configuration

You can modify the maximum domain length in the Zen Browser theme manager settings.

## Troubleshooting

If the domain display doesn't update properly:
- Make sure the scripts are loaded correctly
- Check the browser console for any errors
- Try restarting the browser

## License

This mod is provided as-is under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Changelog

### v1.1.0
- Added domain simplification to show only the main domain
- Improved handling of subdomains and country-specific TLDs
- Updated documentation

### v1.0.0
- Initial release with URL centering functionality 