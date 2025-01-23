import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { default as Redis } from 'ioredis';  // Importing ioredis
import yaml from 'js-yaml';
import fs from 'fs';
import { ITopicMapping } from '../../interfaces/ITopicMapping.js';

// Request Payload Interfaces
interface RequestPayload {
    steamid: string;
}

interface ResponsePayload {
    data: any;
}

export default fp(async function (fastify: FastifyInstance) {
    const SERVICE_NAME = "Service::getOwnedGames";
    let pubsubMapping: ITopicMapping = { sub: ['vanityurl'], pub: ['steamid'] } as ITopicMapping;
    try {
        const { getOwnedGames }: any = await yaml.load(fs.readFileSync('./config/topic-map.yml', 'utf8'));
        console.log(`${SERVICE_NAME} loaded topic map from yml`);
        pubsubMapping = getOwnedGames;
    } catch (e) {
        console.log(e);
    }
    console.log(`${SERVICE_NAME} Topics:
        Sub: ${pubsubMapping.sub},
        Pub: ${pubsubMapping.pub}`)


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
    await consumer.subscribe(...pubsubMapping.sub, async (err, count) => {
        console.log(`${SERVICE_NAME}: Consumer subscribed to ${count} channels`);
    });

    // Set up message handling for each topic
    consumer.on('message', async (channel, message) => {
        try {
            console.log(`${SERVICE_NAME}: Received ${message} from ${channel}`);
            const payload: RequestPayload = JSON.parse(message);
            const url = `http://localhost:65300/IPlayerService/GetOwnedGames/v0001/?steamid=${payload.steamid}&include_appinfo=true&include_played_free_games=true&format=json`
            const { data } = await fastify.axios.get(url);
            const result: ResponsePayload = data.response;
            pubsubMapping.pub.forEach(topic => {
                console.log(`${SERVICE_NAME}: Publishing on ${topic}`)
                producer.publish(topic, JSON.stringify(result))
            });
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