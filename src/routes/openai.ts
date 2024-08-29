import { FastifyInstance } from 'fastify';
import OpenAI from 'openai';
import axios from 'axios';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_ID || undefined,
});

const openaiApiKey = process.env.OPENAI_API_KEY;

export default async function routes(fastify: FastifyInstance) {
    fastify.post('/openai/chat', async (request, reply) => {
        // Using axios here instead of sdk to bypass needing to define json schema here.

        const { model_name, messages, stop_seq, response_format } = request.body as {
            model_name: string;
            messages: any[];
            stop_seq?: string[];
            response_format?: {
                type: string;
                json_schema?: object;
            };
        };

        const maxRetries = 5;
        let attempt = 0;
        let response;

        while (attempt < maxRetries) {
            try {
                response = await axios.post('https://api.openai.com/v1/chat/completions', {
                    model: model_name || "gpt-4o-mini",
                    messages,
                    stop: stop_seq,
                    response_format,
                }, {
                    headers: {
                        'Authorization': `Bearer ${openaiApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 2000 // Set timeout to 1.5 seconds
                });
                break; // Exit loop if request is successful
            } catch (err) {
                attempt++;
                if (attempt >= maxRetries) {
                    reply.send("Connection to OpenAI service timed out.");
                    return;
                }
            }
        }
        // @ts-ignore
        reply.send(response.data.choices[0].message.content);
    });

    fastify.post('/openai/embed', async (request, reply) => {
        const { model_name, text } = request.body as {
            model_name: string;
            text: string;
        };
        try {
            const embedding = await openai.embeddings.create({
                model: model_name || "text-embedding-ada-002",
                input: text,
                encoding_format: "float",
            });
            reply.send(embedding.data[0].embedding);
        } catch (err) {
            const error = err as Error;
            reply.status(500).send(error.message);
        }
    });
}