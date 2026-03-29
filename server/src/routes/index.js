import { Router } from 'express';
import authRoutes from './auth.routes.js';
import propertiesRoutes from './properties.routes.js';
import eventsRoutes from './events.routes.js';
import settingsRoutes from './settings.routes.js';
import artistsRoutes from './artists.routes.js';
import musicRoutes from './music.routes.js';
import galleryRoutes from './gallery.routes.js';
import videosRoutes from './videos.routes.js';
import merchRoutes from './merch.routes.js';
import vinylRoutes from './vinyl.routes.js';
import proxyRoutes from './proxy.routes.js';
import genresRoutes from './genres.routes.js';
import ordersRoutes from './orders.routes.js';
import ticketsRoutes from './tickets.routes.js';
import analyticsRoutes from './analytics.routes.js';
import contactRoutes from './contact.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/properties', propertiesRoutes);
router.use('/events', eventsRoutes);
router.use('/settings', settingsRoutes);
router.use('/artists', artistsRoutes);
router.use('/music', musicRoutes);
router.use('/gallery', galleryRoutes);
router.use('/videos', videosRoutes);
router.use('/merch', merchRoutes);
router.use('/vinyl', vinylRoutes);
router.use('/proxy', proxyRoutes);
router.use('/genres', genresRoutes);
router.use('/orders', ordersRoutes);
router.use('/tickets', ticketsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/contact', contactRoutes);

export default router;
