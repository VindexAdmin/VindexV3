const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    console.log('🔑 Resetting admin password...\n');
    
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const updatedUser = await prisma.user.update({
      where: { email: 'admin@vindex.com' },
      data: { 
        passwordHash: hashedPassword,
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Admin password reset successfully!');
    console.log('📧 Email: admin@vindex.com');
    console.log('🔐 Password: admin123');
    console.log('⏰ Updated at:', updatedUser.updatedAt);
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

resetAdminPassword();
