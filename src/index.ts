import fastify from "fastify";

const app = fastify({ logger: true })

app.get("/", async (req, reply) => {
	return { message: "Hello world" };
});

try {
	app.listen(3000);
	app.log.info("Server listening on port 3000");
} catch (e) {
	app.log.error(e);
	process.exit(1);
};