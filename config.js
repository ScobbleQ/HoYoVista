import dotenv from "dotenv";
dotenv.config();

export const config = {
    token: process.env.TOKEN || "",
    clientId: process.env.CLIENT_ID || "",
    clientSecret: process.env.CLIENT_SECRET || "",
    mongoUri: process.env.MONGO_URI || "",
    webhookId: process.env.WEBHOOK_ID || "",
    webhookToken: process.env.WEBHOOK_TOKEN || "",
};

export const discordPresence = [
    {
        activities: [{ name: "Genshin Impact" }],
        status: "online",
        type: "PLAYING",
    },
    {
        activities: [{ name: "Honkai: Star Rail" }],
        status: "online",
        type: "PLAYING",
    },
    {
        activities: [{ name: "Honkai Impact 3rd" }],
        status: "online",
        type: "PLAYING",
    },
    {
        activities: [{ name: "Zenless Zone Zero" }],
        status: "online",
        type: "PLAYING",
    },
    {
        activities: [{ name: "Tears of Themis" }],
        status: "online",
        type: "PLAYING",
    },
];

export const embedColors = {
    primary: "#576EFF",
    success: "#77DD77",
    warning: "#FDFD96",
    error: "#FF6961",
};
