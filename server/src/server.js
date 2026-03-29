import app from './app.js';
import { config } from './config/env.js';
import { prisma } from './prisma.js';
import bcrypt from 'bcryptjs';
import { seedIfEmpty as seedGenresIfEmpty } from './controllers/genres.controller.js';

async function ensureAdminSeed() {
  try {
    const defaultEmail = 'admin@sunsesh.local';
    const adminPassword = 'admin';
    const defaultPasswordHash = await bcrypt.hash(adminPassword, 10);

    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [{ role: 'ADMIN' }, { email: defaultEmail }, { name: 'admin' }],
      },
    });

    if (!existingAdmin) {
      const user = await prisma.user.create({
        data: {
          name: 'admin',
          email: defaultEmail,
          passwordHash: defaultPasswordHash,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });
      console.log('Usuario admin inicial creado:', user.email, '(password: admin)');
      return;
    }

    const isLegacyAdmin123 = await bcrypt.compare('admin123', existingAdmin.passwordHash).catch(() => false);
    const isAlreadyAdmin = await bcrypt.compare('admin', existingAdmin.passwordHash).catch(() => false);
    if (isLegacyAdmin123 && !isAlreadyAdmin) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { passwordHash: defaultPasswordHash, name: existingAdmin.name || 'admin' },
      });
      console.log('Password admin migrado a valor por defecto: admin');
    }

    // Keep the default superuser identity predictable for first access flows.
    if (String(existingAdmin.name || '').trim() !== 'admin' || existingAdmin.email !== defaultEmail || existingAdmin.role !== 'ADMIN') {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          name: 'admin',
          email: defaultEmail,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });
      console.log('Usuario admin normalizado a credenciales base (usuario: admin)');
    }
  } catch (e) {
    console.log('Seed admin omitido:', e?.message || e);
  }
}

async function ensureArtistSeed() {
  try {
    const count = await prisma.artist.count({ where: { deletedAt: null } });
    if (count === 0) {
      await prisma.artist.createMany({
        data: [
          {
            name: 'RUBZZ',
            genre: 'Techno, Underground, Minimal',
            bio: '',
            profile_image: '/assets/img/rubzz.png',
            social_links: '',
            featured: true,
            status: 'ACTIVE',
          },
          {
            name: 'MERME',
            genre: 'House, Deep Tech, Progressive',
            bio: '',
            profile_image: '/assets/img/merme.png',
            social_links: '',
            featured: true,
            status: 'ACTIVE',
          },
          {
            name: 'DRACK',
            genre: 'Tech House, Melodic, Tribal',
            bio: '',
            profile_image: '/assets/img/drack.png',
            social_links: '',
            featured: true,
            status: 'ACTIVE',
          },
        ],
      });
      console.log('Artistas iniciales creados: RUBZZ, MERME, DRACK');
    } else {
      // Restore genre text if it was cleared by admin panel updates
      const defaults = {
        RUBZZ: 'Techno, Underground, Minimal',
        MERME: 'House, Deep Tech, Progressive',
        DRACK: 'Tech House, Melodic, Tribal',
      };
      for (const [name, genre] of Object.entries(defaults)) {
        await prisma.artist.updateMany({
          where: { name, genre: '', deletedAt: null },
          data: { genre },
        });
      }
    }
  } catch (e) {
    console.log('Seed artistas omitido:', e?.message || e);
  }
}

Promise.all([ensureAdminSeed(), ensureArtistSeed(), seedGenresIfEmpty()]).finally(() => {
  // Warn about insecure default JWT secrets
  if (config.jwtSecret === 'dev-secret-please-change' || config.jwtRefreshSecret === 'dev-refresh-secret-please-change') {
    console.warn('\n⚠  JWT secrets are set to default values. Change JWT_SECRET and JWT_REFRESH_SECRET in .env before deploying to production.\n');
  }

  app.listen(config.port, config.host, () => {
    console.log(`Servidor web+API escuchando en http://${config.host}:${config.port}`);
  });
});

