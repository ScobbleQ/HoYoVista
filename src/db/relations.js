import { relations } from 'drizzle-orm/relations';
import { cookies, events, games, ledgers, users } from './schema.js';

export const cookiesRelations = relations(cookies, ({ one }) => ({
  user: one(users, {
    fields: [cookies.uid],
    references: [users.uid],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  cookies: many(cookies),
  events: many(events),
  games: many(games),
  ledgers: many(ledgers),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  user: one(users, {
    fields: [events.uid],
    references: [users.uid],
  }),
}));

export const gamesRelations = relations(games, ({ one }) => ({
  user: one(users, {
    fields: [games.uid],
    references: [users.uid],
  }),
}));

export const ledgersRelations = relations(ledgers, ({ one }) => ({
  user: one(users, {
    fields: [ledgers.uid],
    references: [users.uid],
  }),
}));
