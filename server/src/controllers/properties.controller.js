import { prisma } from '../prisma.js';
import { validationResult } from 'express-validator';

export const list = async (req, res) => {
  const items = await prisma.property.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { owner: true, tenant: true },
  });
  res.json({ items });
};

export const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validación fallida', errors: errors.array() });
  const { title, description, status, address, ownerId, tenantId } = req.body;
  const item = await prisma.property.create({
    data: { title, description, status, address, ownerId, tenantId },
  });
  res.status(201).json({ item });
};

export const getOne = async (req, res) => {
  const { id } = req.params;
  const item = await prisma.property.findFirst({ where: { id, deletedAt: null }, include: { owner: true, tenant: true } });
  if (!item) return res.status(404).json({ message: 'No encontrado' });
  res.json({ item });
};

export const update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validación fallida', errors: errors.array() });
  const { id } = req.params;
  const { title, description, status, address, ownerId, tenantId } = req.body;
  const item = await prisma.property.update({
    where: { id },
    data: { title, description, status, address, ownerId, tenantId },
  });
  res.json({ item });
};

export const remove = async (req, res) => {
  const { id } = req.params;
  await prisma.property.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  res.status(204).send();
};
