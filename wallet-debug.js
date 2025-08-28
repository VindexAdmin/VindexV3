// Debug script to check available wallets
console.log('=== Wallet Detection Debug ===');
console.log('window.solana:', window.solana);
console.log('window.phantom:', window.phantom);
console.log('window.solflare:', window.solflare);
console.log('Available wallet providers:', Object.keys(window).filter(key => 
  key.includes('solana') || 
  key.includes('phantom') || 
  key.includes('solflare') || 
  key.includes('wallet')
));
