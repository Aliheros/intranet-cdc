const { PrismaClient } = require('@prisma/client');

// Singleton — évite de créer N pools de connexions (un par fichier de route)
const prisma = global._prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global._prisma = prisma;

module.exports = prisma;
