require('dotenv').config();

module.exports = {
    token: process.env.TOKEN || '',
    clientId: process.env.CLIENT_ID || '',
    clientSecret: process.env.CLIENT_SECRET || '',
    webhookId: process.env.WEBHOOK_ID || '',
    webhookToken: process.env.WEBHOOK_TOKEN || '',
    mongoUri: process.env.MONGO_URI || '',
    githubPAT: process.env.GITHUB_PAT || '',
    embedColors: {
        default: '#576EFF',
        success: '#77DD77',
        error: '#FF6961',
        warning: '#FDFD96'
    },
    presence: [
        {
            activities: [{ name: "Genshin Impact" }],
            status: "online",
            type: "PLAYING"
        },
        {
            activities: [{ name: "Honkai: Star Rail" }],
            status: "online",
            type: "PLAYING"
        },
        {
            activities: [{ name: "Honkai Impact 3rd" }],
            status: "online",
            type: "PLAYING"
        },
        {
            activities: [{ name: "Zenless Zone Zero" }],
            status: "online",
            type: "PLAYING"
        },
        {
            activities: [{ name: "Tears of Themis" }],
            status: "online",
            type: "PLAYING"
        }
    ],
}