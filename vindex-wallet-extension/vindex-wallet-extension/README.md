# Vindex Wallet Extension

## Overview
The Vindex Wallet Extension is a Chrome extension designed to provide users with a seamless experience for managing their VDX tokens. This extension allows users to interact with the Vindex blockchain directly from their browser, offering features such as wallet management, transaction history, and settings configuration.

## Features
- **Wallet Management**: Easily manage your VDX tokens, view balances, and send/receive tokens.
- **Transaction History**: Keep track of all your transactions in a user-friendly interface.
- **Settings Configuration**: Customize your wallet settings to enhance your experience.

## Project Structure
```
vindex-wallet-extension
├── public
│   ├── manifest.json       # Metadata for the Chrome extension
│   └── index.html          # Main HTML file for the extension's popup or options page
├── src
│   ├── background.ts       # Background script for managing events
│   ├── content.ts          # Content script for interacting with web pages
│   ├── popup
│   │   ├── Popup.tsx       # React component for the popup interface
│   │   └── Popup.css       # Styles for the Popup component
│   ├── options
│   │   ├── Options.tsx     # React component for the options page
│   │   └── Options.css     # Styles for the Options component
│   ├── assets              # Directory for images and icons
│   └── types
│       └── index.ts        # TypeScript interfaces and types
├── package.json            # npm configuration file
├── tsconfig.json           # TypeScript configuration file
└── README.md               # Documentation for the project
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd vindex-wallet-extension
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## Usage
1. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `public` directory.
2. Click on the extension icon to open the popup and start managing your VDX tokens.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.