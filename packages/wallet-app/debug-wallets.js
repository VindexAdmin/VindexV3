// Debug script para testear wallets
console.log('🔍 Testing wallet installations...');

// Check Phantom
if (typeof window !== 'undefined') {
  console.log('Window object exists');
  
  // Phantom checks
  console.log('=== PHANTOM DEBUG ===');
  console.log('window.solana:', window.solana);
  console.log('window.phantom:', window.phantom);
  console.log('window.phantom?.solana:', window.phantom?.solana);
  
  if (window.solana) {
    console.log('Phantom detected via window.solana');
    console.log('isPhantom:', window.solana.isPhantom);
    console.log('isConnected:', window.solana.isConnected);
    console.log('publicKey:', window.solana.publicKey);
    console.log('Methods:', Object.getOwnPropertyNames(window.solana));
  }
  
  // Solflare checks
  console.log('=== SOLFLARE DEBUG ===');
  console.log('window.solflare:', window.solflare);
  
  if (window.solflare) {
    console.log('Solflare detected');
    console.log('isConnected:', window.solflare.isConnected);
    console.log('Methods:', Object.getOwnPropertyNames(window.solflare));
  }
} else {
  console.log('Window object not available (SSR)');
}
