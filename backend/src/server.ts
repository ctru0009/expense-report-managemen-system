import fs from 'fs';
import { app, prisma } from './app';
import { config } from './config/env';

const PORT = parseInt(process.env.PORT || '3001', 10);

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
