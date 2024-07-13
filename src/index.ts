import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import { server as WebSocketServer } from 'websocket';
import { setupDeepgram } from './deepgram';
import { ListenLiveClient } from '@deepgram/sdk';
import openaiRoutes from './routes/openai';

const fastify = Fastify();
const port = 11111;

fastify.register(fastifyCors, {
    origin: ['http://localhost', 'http://localhost:5173', 'http://localhost:4173'],
    credentials: true
});

fastify.register(openaiRoutes);

fastify.get('/ping', async (request, reply) => {
    reply.send('pong');
});

const startServer = async () => {
    try {
        const address = await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`Server running at ${address}`);

        const wsServer = new WebSocketServer({
            httpServer: fastify.server,
            autoAcceptConnections: false
        });

        wsServer.on('request', (request) => {
            const connection = request.accept(null, request.origin);
            console.log("socket: client connected");
            let deepgram: ListenLiveClient | null = setupDeepgram(connection);

            connection.on('message', (message) => {
                if (deepgram && message.type === 'binary' && deepgram.getReadyState() === 1) {
                    deepgram.send(message.binaryData);
                } else if (deepgram && deepgram.getReadyState() >= 2) {
                    console.log("socket: data couldn't be sent to deepgram");
                    console.log("socket: retrying connection to deepgram");
                    deepgram.requestClose();
                    deepgram.removeAllListeners();
                    deepgram = null;
                } else {
                    console.log("socket: data couldn't be sent to deepgram");
                }
            });

            connection.on('close', () => {
                console.log("socket: client disconnected");
                if (deepgram) {
                    deepgram.requestClose();
                    deepgram.removeAllListeners();
                    deepgram = null;
                }
            });
        });
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

startServer();