import { config } from 'dotenv';
import postgres from 'postgres';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL!;

async function migrate() {
  console.log('Starting migration...');

  const sql = postgres(connectionString, { prepare: false });

  try {
    const migrationsDir = join(process.cwd(), 'lib/db/migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${migrationFiles.length} migration file(s)`);

    for (const file of migrationFiles) {
      console.log(`\n📄 Processing: ${file}`);
      const migrationPath = join(migrationsDir, file);
      const migrationSQL = readFileSync(migrationPath, 'utf-8');

      // Split by statement breakpoint and execute each statement
      const statements = migrationSQL.split('--> statement-breakpoint').filter(s => s.trim());

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        if (statement) {
          try {
            await sql.unsafe(statement);
            console.log(`  ✓ Statement ${i + 1}/${statements.length} executed`);
          } catch (error: unknown) {
            const err = error as { message?: string };
            // Skip if already exists errors
            if (err.message?.includes('already exists')) {
              console.log(`  ⚠ Statement ${i + 1} skipped (already exists)`);
            } else {
              throw error;
            }
          }
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
