import { 
	FastifyInstance,
	FastifyRequest as Request,
	FastifyReply as Reply
} from "fastify";

interface APIServiceOptions {
	port?: number;
}

/// Main router for backend endpoints.
class APIService {
	private port: number;
	public constructor(private app: FastifyInstance, options?: APIServiceOptions) {
		this.port = options.port || 3000;

		/// Setup our routes here.
		/// TODO: Refactor endpoint registering to be less trash.
		this.app.get('/api/providers/sharex', this.handleShareXUpload.bind(this));
	}

	public listen() {
		try {
			this.app.listen(this.port);
			this.app.log.info(`Server listening on port ${this.port}`);
		} catch (e) {
			this.app.log.error(e);
			process.exit(1);
		};
	}

	private handleShareXUpload(req: Request, reply: Reply) {
		reply.header("Content-Type", "application/json");
		return { status: 200, message: "Test"}
	}
}

export { APIService, APIServiceOptions };
