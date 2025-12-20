import { messagingApi } from '@line/bot-sdk';
import { config } from 'dotenv';

// Ensure env vars are loaded for CLI/Testing
config();

const { MessagingApiClient } = messagingApi;

let clientInstance: messagingApi.MessagingApiClient | null = null;

function getLineClient() {
    if (clientInstance) return clientInstance;

    config();
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!channelAccessToken) {
        console.error('LINE_CHANNEL_ACCESS_TOKEN is not set in environment variables');
    }

    clientInstance = new MessagingApiClient({
        channelAccessToken: channelAccessToken || '',
    });
    return clientInstance;
}

export async function sendLineMessage(to: string, text: string) {
    try {
        const client = getLineClient();
        await client.pushMessage({
            to,
            messages: [{ type: 'text', text }],
        });
        console.log(`[LINE] Message sent to ${to}`);
        return { success: true };
    } catch (error: any) {
        console.error('[LINE] Failed to send message:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

export async function sendLineBroadcast(text: string) {
    try {
        const client = getLineClient();
        await client.broadcast({
            messages: [{ type: 'text', text }],
        });
        console.log(`[LINE] Broadcast message sent.`);
        return { success: true };
    } catch (error: any) {
        console.error('[LINE] Failed to send broadcast:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

