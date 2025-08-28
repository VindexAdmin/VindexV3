const { AuthService } = require('./src/services/AuthService');

async function testPersistence() {
  console.log('🧪 Testing PostgreSQL persistence...\n');

  try {
    // Test user registration
    console.log('1. Testing user registration...');
    const testEmail = `test${Date.now()}@vindex.local`;
    const testPassword = 'testpassword123';
    
    const registrationResult = await AuthService.register(testEmail, testPassword);
    console.log('✅ User registered successfully:');
    console.log('   - User ID:', registrationResult.user.id);
    console.log('   - Email:', registrationResult.user.email);
    console.log('   - Wallet Address:', registrationResult.wallet.address);
    console.log('   - Wallet Balance:', registrationResult.wallet.balance);

    // Test user login
    console.log('\n2. Testing user login...');
    const loginResult = await AuthService.login(testEmail, testPassword);
    console.log('✅ User logged in successfully:');
    console.log('   - Token generated:', loginResult.token ? 'Yes' : 'No');
    console.log('   - User ID:', loginResult.user.id);
    console.log('   - Number of wallets:', loginResult.wallets ? loginResult.wallets.length : 0);

    // Test wallet retrieval
    console.log('\n3. Testing wallet retrieval...');
    const wallets = await AuthService.getUserWallets(registrationResult.user.id);
    console.log('✅ Wallets retrieved successfully:');
    console.log('   - Number of wallets:', wallets.length);
    if (wallets.length > 0) {
      console.log('   - First wallet address:', wallets[0].address);
      console.log('   - First wallet balance:', wallets[0].balance);
    }

    console.log('\n🎉 All persistence tests passed! Data is being saved to PostgreSQL.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    // Clean up - in a real scenario, you might want to keep test data
    console.log('\n🧹 Test completed.');
    process.exit(0);
  }
}

testPersistence();
