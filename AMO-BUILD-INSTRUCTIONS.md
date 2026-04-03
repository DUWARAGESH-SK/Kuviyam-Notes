# Mozilla AMO Source Code Build Instructions

This document provides step-by-step instructions for Mozilla add-on reviewers to recreate the minified extension code (`kuviyam-notes-firefox-v1.0.0.zip`) from this source code archive.

## Prerequisites & Requirements

- **Operating System**: Windows, macOS, or Linux
- **Node.js**: v18.x or higher (tested with v20.x)
- **npm**: v9.x or higher

## Build Instructions

To build an exact copy of the extension from this source code, follow these technical steps:

1. Extract the source code archive to a local folder.
2. Open a terminal and navigate to the extracted folder.
3. Install the dependencies using npm:
   ```bash
   npm install
   ```
4. Execute the Firefox AMO build script:
   ```bash
   npm run build:amo
   ```

## Output

The build script will execute TypeScript compilation, Vite bundling, and run a custom packager script (`scripts/package-amo.js`). 
Once complete, the uncompressed build output will be available in the `dist/firefox/` directory.

The repackaged, compliant built extension ready for submission will be generated at:
`dist/firefox-package/kuviyam-notes-firefox-v1.0.0.zip`

This output should mirror the exact structure and functionality of the submitted add-on package.
