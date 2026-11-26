'use strict';

/*
 * Самолечащийся baseline-гвард для Prisma Migrate.
 *
 * Запускается перед `prisma migrate deploy` при старте контейнера.
 * Для уже существующей базы (созданной через `prisma db push` или по старым,
 * неполным миграциям) регистрирует консолидированную миграцию 0_init как
 * применённую — БЕЗ выполнения её SQL, чтобы `migrate deploy` не пытался
 * пересоздать уже существующие таблицы (ошибки P3005 / "type already exists").
 *
 * Идемпотентно и безопасно:
 *   - пустая база            -> ничего не делает (0_init применит migrate deploy);
 *   - база уже вылечена      -> ничего не делает;
 *   - существующая база      -> один раз регистрирует 0_init;
 *   - неполная запись 0_init -> очищает и регистрирует заново.
 *
 * Данные никогда не затрагиваются.
 */

const { Client } = require('pg');
const { execSync } = require('child_process');

const BASELINE = '0_init';

async function regclassExists(client, name) {
	const res = await client.query('SELECT to_regclass($1) AS t', [name]);
	return res.rows[0].t !== null;
}

async function main() {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		console.log('[baseline] DATABASE_URL не задан — пропускаю');
		return;
	}

	const client = new Client({ connectionString });
	await client.connect();
	try {
		// Пустая база? Тогда baseline применит сам `migrate deploy`.
		const appExists = await regclassExists(client, 'public."User"');
		if (!appExists) {
			console.log('[baseline] пустая база — baseline применит migrate deploy');
			return;
		}

		// Схема уже существует. Проверяем, зарегистрирован ли baseline.
		const migTableExists = await regclassExists(client, 'public._prisma_migrations');
		if (migTableExists) {
			const rows = (
				await client.query(
					`SELECT finished_at, rolled_back_at
					   FROM "_prisma_migrations"
					  WHERE migration_name = $1
					  ORDER BY started_at DESC
					  LIMIT 1`,
					[BASELINE],
				)
			).rows;

			if (rows.length > 0) {
				const r = rows[0];
				if (r.finished_at && !r.rolled_back_at) {
					console.log('[baseline] 0_init уже зарегистрирован — ничего не делаю');
					return;
				}
				// Неполная/откатанная запись — удаляем перед повторной регистрацией.
				// 0_init падает на первом же стейтменте, поэтому таблицы не затронуты.
				console.log('[baseline] найдена неполная запись 0_init — очищаю');
				await client.query(
					'DELETE FROM "_prisma_migrations" WHERE migration_name = $1',
					[BASELINE],
				);
			}
		}

		console.log('[baseline] существующая база — регистрирую 0_init как применённый');
		execSync(`npx prisma migrate resolve --applied ${BASELINE}`, { stdio: 'inherit' });
		console.log('[baseline] готово');
	} finally {
		await client.end();
	}
}

main().catch((err) => {
	console.error('[baseline] ошибка:', err && err.message ? err.message : err);
	process.exit(1);
});
