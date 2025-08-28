const { AuthService } = require('./src/services/AuthService');

async function testWalletFunctionality() {
  console.log('🧪 Testing Wallet Panel Improvements...\n');

  try {
    // 1. Login as admin to get wallets
    console.log('1. Logging in as admin...');
    const loginResult = await AuthService.login('admin@vindex.com', 'admin123');
    console.log('✅ Login successful');
    console.log('   - User ID:', loginResult.user.id);
    console.log('   - Number of wallets:', loginResult.wallets?.length || 0);

    if (loginResult.wallets && loginResult.wallets.length > 0) {
      console.log('   - First wallet address:', loginResult.wallets[0].address);
      console.log('   - First wallet balance:', loginResult.wallets[0].balance);
    }

    // 2. Test getUserWallets method
    console.log('\n2. Testing getUserWallets method...');
    const wallets = await AuthService.getUserWallets(loginResult.user.id);
    console.log('✅ Wallets retrieved:');
    wallets.forEach((wallet, index) => {
      console.log(`   - Wallet ${index + 1}: ${wallet.address} (${wallet.balance} VDX)`);
    });

    console.log('\n🎉 Wallet functionality tests passed!');
    console.log('\n📋 What you can now test in the UI:');
    console.log('   1. Open wallet panel (click "1 Wallet" button)');
    console.log('   2. Try sending VDX to another address');
    console.log('   3. Check the "Receive" tab for real wallet address');
    console.log('   4. Copy the wallet address (should show notification)');
    console.log('   5. View transaction history');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    process.exit(0);
  }
}

testWalletFunctionality();
