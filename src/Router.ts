import { 
	FastifyInstance,
	FastifyRequest as Request,
	FastifyReply as Reply
} from "fastify";
import { Connection, createConnection, getRepository, Repository } from "typeorm";
import { FileEntry } from "./entities";
import { FileUploadReply } from "./structs";
import { randomString } from './util/randomString';

/// Main router for backend endpoints.
class APIService {
	private port: number;
	private db: Connection;
	private files: Repository<FileEntry>;

	public constructor(private app: FastifyInstance, options?: APIServiceOptions) {
		this.port = options.port || 3000;

		/// Setup our routes here.
		/// TODO: Refactor endpoint registering to be less trash.
		this.app.register(require("fastify-multipart"));

		this.app.post("/api/providers/sharex", this.handleShareXUpload.bind(this));
		this.app.get("/i/:imageId", this.handleGetImage.bind(this));

		(async () => {
			this.db = await createConnection({
				type: "postgres",
				host: "localhost",
				port: 5432,
				username: "postgres",
				password: "test",
				database: "voidchan",
				synchronize: true,
				entities: [
					FileEntry
				]
			});
		})().then(() => {
			this.files = getRepository<FileEntry>(FileEntry)
		});
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

	private async handleGetImage(req: Request, reply: Reply) {
		const id = (req.params as any).imageId;

		const file = await this.files.findOne({ id });
		if (!file) {
			reply.header("Content-Type", "text/plain");
			reply.status(404);
			return "Image not found!";
		}

		reply.header("Content-Type", file.mimetype);

		return file.buffer;
	}


	// This is untyped due to the mimetype support we need.
	private async handleShareXUpload(req: any, reply: any) {

		if (!req.headers.authorization || req.headers.authorization !== process.env.UPLOAD_SECRET) {
			reply.status(401);
			reply.header("Content-Type", "text/plain");
			return "You are unable to access this endpoint.";
		}

		const data = await req.file();

		const token = randomString(7, false);
		/// TODO: We should have a better way to parse the type than this.
		const mimetype = data.mimetype.split("/")[1];
		const fileBuffer = await data.toBuffer();

		const file = new FileEntry();

		file.id = token;
		file.mimetype = data.mimetype;
		file.uploadDate = new Date();
		file.buffer = fileBuffer;

		await this.files.save(file);

		reply.header("Content-Type", "application/json");

		return {
			statusCode: 200,
			files: [
				{
					name: `${token}.${mimetype}`,
					url: `https://${req.header.host}/i/${token}`
				}
		]} as FileUploadReply;
	}
}

interface APIServiceOptions {
	port?: number;
}

export { APIService, APIServiceOptions };
