import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@admin.com';
  
  const existingAdmin = await prisma.usuario.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const senha_hash = await bcrypt.hash('admin123', 10);
    await prisma.usuario.create({
      data: {
        nome: 'Administrador geral',
        email: adminEmail,
        senha_hash,
        role: 'ADMIN' // It's a string now
      }
    });
    console.log('Admin user created: admin@admin.com / admin123');
  } else {
    // ensure it is ADMIN
    await prisma.usuario.update({ where: { email: adminEmail }, data: { role: 'ADMIN' } });
    console.log('Admin user already exists.');
  }

  const anotadorEmail = 'anotador@anotador.com';
  const existingAnotador = await prisma.usuario.findUnique({
    where: { email: anotadorEmail }
  });

  if (!existingAnotador) {
    const senha_hash = await bcrypt.hash('anotador123', 10);
    await prisma.usuario.create({
      data: {
        nome: 'Anotador',
        email: anotadorEmail,
        senha_hash,
        role: 'ANOTADOR' // New role
      }
    });
    console.log('Anotador user created: anotador@anotador.com / anotador123');
  } else {
    // ensure it is ANOTADOR
    await prisma.usuario.update({ where: { email: anotadorEmail }, data: { role: 'ANOTADOR' } });
    console.log('Anotador user already exists.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });