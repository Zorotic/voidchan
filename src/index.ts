import fastify from "fastify";
import { 
	FastifyRequest as Request,
	FastifyReply as Reply
} from "fastify";

const app = fastify({ logger: true, trustProxy: true });

app.get("/", async (req: Request, reply: Reply) => {
	return { message: "Hello world" };
});

try {
	app.listen(3000);
	app.log.info("Server listening on port 3000");
} catch (e) {
	app.log.error(e);
	process.exit(1);
};