import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || '');

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS webhooks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      url varchar(2048) NOT NULL,
      secret varchar(255) NOT NULL,
      events text[] NOT NULL,
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS webhooks_project_id_idx ON webhooks(project_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      webhook_id uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
      event varchar(50) NOT NULL,
      payload jsonb NOT NULL,
      status_code varchar(10),
      response_body text,
      success boolean NOT NULL DEFAULT false,
      attempts varchar(10) NOT NULL DEFAULT '1',
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS webhook_deliveries_webhook_id_idx ON webhook_deliveries(webhook_id)`;
  await sql`CREATE INDEX IF NOT EXISTS webhook_deliveries_created_at_idx ON webhook_deliveries(created_at)`;

  console.log('Webhook tables created');
  await sql.end();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
