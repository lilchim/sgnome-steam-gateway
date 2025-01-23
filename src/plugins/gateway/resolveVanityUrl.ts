import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { default as Redis } from 'ioredis';  // Importing ioredis
import yaml from 'js-yaml';
import fs from 'fs';
import { ITopicMapping } from '../../interfaces/ITopicMapping.js';

// Request Payload Interfaces
interface IResolveVanityUrl {
    vanityurl: string;
}

interface IResolveVanityUrlResult {
    steamid: number;
}

export default fp(async function (fastify: FastifyInstance) {
    const SERVICE_NAME = "Service::resolveVanityUrl";
    let resolveVanityUrlTopicMap: ITopicMapping = { sub: ['vanityurl'], pub: ['steamid'] } as ITopicMapping;
    try {
        const { resolveVanityUrl }: any = await yaml.load(fs.readFileSync('./config/topic-map.yml', 'utf8'));
        console.log(`${SERVICE_NAME} loaded topic map from yml`);
        resolveVanityUrlTopicMap = resolveVanityUrl;
    } catch (e) {
        console.log(e);
    }
    console.log(`${SERVICE_NAME} Topics:
        Sub: ${resolveVanityUrlTopicMap.sub},
        Pub: ${resolveVanityUrlTopicMap.pub}`)


    // Create Redis Consumer and Producer Clients
    const consumer = new Redis.default({
        host: '127.0.0.1',
        // Add other Redis options if needed
    });

    const producer = new Redis.default({
        host: '127.0.0.1',
        // Add other Redis options if needed
    });

    // Subscribe to the topics
    await consumer.subscribe(...resolveVanityUrlTopicMap.sub, async (err, count) => {
        console.log(`Consumer subscribed to ${count} channels`);
    });

    // Set up message handling for each topic
    consumer.on('message', async (channel, message) => {
        try {
            const payload: IResolveVanityUrl = JSON.parse(message);
            const url = `http://localhost:65300/ISteamUser/ResolveVanityURL/v0001/?vanityurl=${payload.vanityurl}`;
            const { data } = await fastify.axios.get(url);
            const result: IResolveVanityUrlResult = data.response;
            resolveVanityUrlTopicMap.pub.forEach(topic =>
                producer.publish(topic, JSON.stringify(result))
            );
            console.log(`Received ${message} from ${channel}`);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    });

    // Clean up on shutdown
    fastify.addHook('onClose', async (instance: FastifyInstance) => {
        await consumer.quit();
        await producer.quit();
    });
});