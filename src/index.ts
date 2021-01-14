import fastify, { FastifyInstance } from "fastify";
import { APIService } from './Router';

require('dotenv').config();

const app: FastifyInstance = fastify({ logger: true, trustProxy: true });

const api = new APIService(app, {
	port: process.env.PORT
});

api.listen();
