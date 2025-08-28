# Fix: Next.js Hydration Error in Bridge

## Problem
Users were getting this React hydration error:
```
Unhandled Runtime Error
Error: Text content does not match server-rendered HTML.
Text content did not match. Server: "Not installed" Client: "✓ Installed"
```

## Root Cause
The error occurred because:
1. **Server-Side Rendering (SSR)**: During SSR, `window` object is not available
2. **Wallet Detection**: `phantomWalletService.isInstalled()` and `solflareWalletService.isInstalled()` check `window.phantom` and `window.solflare`
3. **Mismatch**: Server renders "Not installed" (no `window`), but client renders "✓ Installed" (wallet detected)
4. **React Hydration**: React detects the content mismatch and throws error

## Solution Implemented

### 1. Added Client-Side Detection State
```tsx
const [isClient, setIsClient] = useState(false);

// Detect client-side hydration
useEffect(() => {
  setIsClient(true);
}, []);
```

### 2. Modified Wallet Status Display
```tsx
// Before (causing hydration error):
{phantomWalletService.isInstalled() ? (
  <span className="text-green-600">✓ Installed</span>
) : (
  <span className="text-gray-400">Not installed</span>
)}

// After (hydration-safe):
{!isClient ? (
  <span className="text-gray-400">Checking...</span>
) : phantomWalletService.isInstalled() ? (
  <span className="text-green-600">✓ Installed</span>
) : (
  <span className="text-gray-400">Not installed</span>
)}
```

### 3. Applied to Both Wallets
- Fixed Phantom wallet status display
- Fixed Solflare wallet status display
- Both now show "Checking..." during initial render

## How It Works

### Server-Side Rendering (Initial):
- `isClient = false`
- Shows "Checking..." for both wallets
- No wallet detection attempted
- Consistent content between server and client

### Client-Side Hydration:
- `useEffect` runs, sets `isClient = true`
- Component re-renders with actual wallet detection
- Shows "✓ Installed" or "Not installed" based on actual detection
- No content mismatch because initial render is consistent

### User Experience:
1. **First Load**: Briefly shows "Checking..." (milliseconds)
2. **After Hydration**: Shows actual wallet status
3. **No Error**: Smooth transition, no hydration errors

## Benefits
- ✅ Eliminates hydration errors
- ✅ Maintains functionality
- ✅ Smooth user experience
- ✅ Proper SSR/Client separation
- ✅ Works with all wallets

## Testing
1. Open bridge page: http://localhost:3005/bridge
2. Check browser console - no hydration errors
3. Wallet status displays correctly after brief "Checking..."
4. Installation detection works properly

This fix ensures the bridge page loads without React hydration errors while maintaining all wallet detection functionality.
