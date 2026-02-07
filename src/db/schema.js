import { sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const gamesIdSeq = pgSequence('games_id_seq', {
  startWith: '1',
  increment: '1',
  minValue: '1',
  maxValue: '9223372036854775807',
  cache: '1',
  cycle: false,
});

export const users = pgTable('users', {
  uid: text().primaryKey().notNull(),
  createdAt: text('created_at').notNull(),
  subscribed: boolean().default(true).notNull(),
  private: boolean().default(false).notNull(),
  collectData: boolean('collect_data').default(true).notNull(),
  notifyCheckin: boolean('notify_checkin').default(true).notNull(),
  notifyRedeem: boolean('notify_redeem').default(true).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const cookies = pgTable(
  'cookies',
  {
    uid: text().primaryKey().notNull(),
    ltmidV2: text('ltmid_v2'),
    ltokenV2: text('ltoken_v2'),
    ltuidV2: text('ltuid_v2'),
    mi18Nlang: text('mi18nlang'),
    accountIdV2: text('account_id_v2'),
    accountMidV2: text('account_mid_v2'),
  },
  (table) => [
    foreignKey({
      columns: [table.uid],
      foreignColumns: [users.uid],
      name: 'cookies_uid_fkey',
    }).onDelete('cascade'),
  ]
);

export const events = pgTable(
  'events',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    uid: text().notNull(),
    game: text().notNull(),
    type: text().notNull(),
    timestamp: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    metadata: jsonb(),
  },
  (table) => [
    index('events_uid_idx').using('btree', table.uid.asc().nullsLast().op('text_ops')),
    index('events_uid_timestamp_idx').using(
      'btree',
      table.uid.asc().nullsLast().op('text_ops'),
      table.timestamp.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.uid],
      foreignColumns: [users.uid],
      name: 'events_uid_fkey',
    }).onDelete('cascade'),
  ]
);

export const games = pgTable(
  'games',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'games_id_seq1',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    uid: text().notNull(),
    gameId: text('game_id').notNull(),
    gameRoleId: text('game_role_id').notNull(),
    region: text().notNull(),
    regionName: text('region_name').notNull(),
    autoCheckin: boolean('auto_checkin').default(true).notNull(),
    autoRedeem: boolean('auto_redeem').default(true).notNull(),
    attemptedCodes: text('attempted_codes').array().default(['']).notNull(),
    game: text().notNull(),
  },
  (table) => [
    index('games_uid_idx').using('btree', table.uid.asc().nullsLast().op('text_ops')),
    foreignKey({
      columns: [table.uid],
      foreignColumns: [users.uid],
      name: 'games_uid_fkey',
    }).onDelete('cascade'),
  ]
);

export const ledgers = pgTable(
  'ledgers',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    uid: text().notNull(),
    month: smallint().notNull(),
    year: integer().notNull(),
    gameId: text('game_id').notNull(),
    gameRoleId: text('game_role_id').notNull(),
    data: jsonb(),
  },
  (table) => [
    foreignKey({
      columns: [table.uid],
      foreignColumns: [users.uid],
      name: 'ledgers_uid_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
);
