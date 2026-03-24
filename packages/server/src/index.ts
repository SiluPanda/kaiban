import { buildApp } from './app';

const port = parseInt(process.env.PORT || '3456', 10);
const host = process.env.HOST || '0.0.0.0';

async function main() {
  const app = await buildApp();

  await app.listen({ port, host });
  console.log(`Pith server running at http://${host}:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
