import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { client as WebSocketClient, connection as WebSocketConnection } from 'websocket';

const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);
let keepAlive: NodeJS.Timeout | undefined;

export const setupDeepgram = (ws: WebSocketConnection) => {
    const deepgram = deepgramClient.listen.live({
        language: "en",
        punctuate: true,
        smart_format: true,
        model: "nova",
    });

    if (keepAlive) clearInterval(keepAlive);
    keepAlive = setInterval(() => {
        deepgram.keepAlive();
    }, 10 * 1000);

    deepgram.addListener(LiveTranscriptionEvents.Open, async () => {
        console.log("deepgram: connected");

        deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
            const transcript = data.channel.alternatives[0].transcript;
            ws.sendUTF(transcript); // Change send method
        });

        deepgram.addListener(LiveTranscriptionEvents.Close, async () => {
            console.log("deepgram: disconnected");
            clearInterval(keepAlive);
            deepgram.requestClose();
        });

        deepgram.addListener(LiveTranscriptionEvents.Error, async (error) => {
            console.log("deepgram: error received");
            console.error(error);
        });

        deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
            ws.sendUTF(JSON.stringify({ metadata: data }));
        });
    });

    return deepgram;
};