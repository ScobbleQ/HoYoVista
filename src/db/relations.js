import { relations } from 'drizzle-orm/relations';
import { users, cookies, events, games } from './schema.js';

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
