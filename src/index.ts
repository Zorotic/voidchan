import fastify, { FastifyInstance } from "fastify";
import { APIService } from './Router';

const app: FastifyInstance = fastify({ logger: true, trustProxy: true });

const api = new APIService(app, {
	port: 3000
});

api.listen();
