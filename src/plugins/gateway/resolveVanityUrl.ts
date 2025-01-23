import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin'
import {default as axios} from 'fastify-axios';

// Request Payload
interface IResolveVanityUrl {
    vanityurl: string;
}

interface IResolveVanityUrlResult {
    steamid: number;
}

export default fp(async function (fastify: FastifyInstance) {
    fastify.register(axios.default);
    const client = fastify.redis;
    const topicsTest = ['test1', 'test2'];
    client.subscribe(...topicsTest, async (channel, message) => {
        const payload = message as IResolveVanityUrl;
        console.log(payload);
        const url = `http://localhost:65300/ISteamUser/ResolveVanityURL/v0001/?vanityurl=${payload.vanityurl}`
        const {data} = await fastify.axios.get(url);
        const result = data.response as IResolveVanityUrlResult
        client.publish('test1', JSON.stringify(result));
    })
});