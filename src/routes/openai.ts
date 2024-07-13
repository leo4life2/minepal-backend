import { FastifyInstance } from 'fastify';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_ID || undefined,
});

export default async function routes(fastify: FastifyInstance) {
    fastify.post('/openai/chat', async (request, reply) => {
        const { model_name, messages, stop_seq } = request.body as {
            model_name: string;
            messages: OpenAI.Chat.ChatCompletionMessageParam[];
            stop_seq?: string[];
        };
        try {
            const completion = await openai.chat.completions.create({
                model: model_name || "gpt-3.5-turbo",
                messages,
                stop: stop_seq,
            });
            reply.send(completion.choices[0].message.content);
        } catch (err) {
            const error = err as Error;
            reply.status(500).send(error.message);
        }
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