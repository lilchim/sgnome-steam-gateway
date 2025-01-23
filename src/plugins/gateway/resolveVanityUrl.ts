import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { default as Redis } from 'ioredis';  // Importing ioredis

// Request Payload Interfaces
interface IResolveVanityUrl {
    vanityurl: string;
}

interface IResolveVanityUrlResult {
    steamid: number;
}

export default fp(async function (fastify: FastifyInstance) {
    const topicsTest = ['vanityurl', 'test2'];

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
    await consumer.subscribe(...topicsTest);
    console.log(`Consumer subscribed to ${topicsTest.length} channels`);

    // Set up message handling for each topic
    consumer.on('message', async (channel, message) => {
        try {
            const payload: IResolveVanityUrl = JSON.parse(message);
            const url = `http://localhost:65300/ISteamUser/ResolveVanityURL/v0001/?vanityurl=${payload.vanityurl}`;
            const { data } = await fastify.axios.get(url);
            const result: IResolveVanityUrlResult = data.response;
            producer.publish('SGNOME/Steam/steamid', JSON.stringify(result));
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