import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { default as axios } from 'fastify-axios';

export default fp(async function (fastify: FastifyInstance) {
    fastify.register(axios.default);
});