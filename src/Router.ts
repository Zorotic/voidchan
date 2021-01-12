import {
	FastifyInstance,
	FastifyRequest as Request,
	FastifyReply as Reply
} from "fastify";

import {
	Connection,
	createConnection,
	getRepository,
	Repository 
} from "typeorm";

import { FileEntry, ShortenedURL } from "./entities";
import { FileUploadReply, ShortenedURLReply } from "./structs";
import { randomString } from "./util/randomString";

import * as mime from "mime";
import * as redis from "ioredis";

class APIService {
	private port: number;
	private db: Connection;
	private files: Repository<FileEntry>;
	private urls: Repository<ShortenedURL>;
	private redis: redis.Redis = new redis(); // TODO: Parse login information.

	public constructor(private app: FastifyInstance, options?: APIServiceOptions) {
		this.port = options.port || 3000;
		this.app.register(require("fastify-multipart"));

		/// Setup our routes here.
		this.app.post("/api/providers/sharex", this.handleShareXUpload.bind(this));
		this.app.post("/api/providers/shortener", this.shortenURL.bind(this));

		/// View statistics.
		this.app.get("/api/providers/shortener/:id", this.viewShortenURL.bind(this));
		this.app.get("/api/providers/sharex/:id", this.viewShareXUpload.bind(this));

		/// For uploaded content.
		this.app.get("/u/:id", this.handleGetFile.bind(this));

		/// For shortened URLs.
		this.app.get("/:id", this.handleShortenedURL.bind(this));

		(async () => {
			this.db = await createConnection({
				type: "postgres",
				host: "localhost",
				port: 5432,
				username: "postgres",
				password: process.env.POSTGRES_PASSWORD,
				database: "voidchan",
				synchronize: true,
				entities: [
					FileEntry,
					ShortenedURL
				]
			});
		})().then(() => {
			this.files = getRepository<FileEntry>(FileEntry);
			this.urls = getRepository<ShortenedURL>(ShortenedURL);
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

	private async viewShortenURL(req: Request, reply: Reply) {
		if (!req.headers.authorization || req.headers.authorization !== process.env.UPLOAD_SECRET) {
			reply.status(401);
			reply.header("Content-Type", "text/plain");
			return "You are unable to access this endpoint.";
		}
		const id = (req.params as any).id;
		const url = await this.urls.findOne({ id });

		if (!url) {
			reply.header("Content-Type", "text/plain");
			reply.status(404);
			return "The wizards have been unable to find the url you are looking for!";
		}

		return {
			id: url.id,
			stats: {
				clicks: url.redirects
			}
		}
	}

	private async viewShareXUpload(req: Request, reply: Reply) {
		if (!req.headers.authorization || req.headers.authorization !== process.env.UPLOAD_SECRET) {
			reply.status(401);
			reply.header("Content-Type", "text/plain");
			return "You are unable to access this endpoint.";
		}
		const id = (req.params as any).id;

		const image = await this.files.findOne({ id });
		
		if (!image) {
			reply.header("Content-Type", "text/plain");
			reply.status(404);
			return "The wizards have been unable to find the file you are looking for!";
		}

		return {
			imageId: image.id,
			stats: {
				views: image.views,
				uploadDate: image.uploadDate
			}
		}
	}

	private async shortenURL(req: Request, reply: Reply) {
		if (!req.headers.authorization || req.headers.authorization !== process.env.UPLOAD_SECRET) {
			reply.status(401);
			reply.header("Content-Type", "text/plain");
			return "You are unable to access this endpoint.";
		}

		const body = req.body as any;

		if (!body.url) {
			return {
				statusCode: 200,
				error: "Unable to parse body, missing URL property."
			}
		}

		const url = body.url;
		const id = body.slug ? body.slug : randomString(4, false);

		const urlEntity = new ShortenedURL();

		urlEntity.destUrl = url;
		urlEntity.id = id;
		urlEntity.redirects = 0;

		await this.urls.save(urlEntity);

		return {
			shortened: `https://${process.env.SHORT_HOSTNAME}/${id}`,
			url
		} as ShortenedURLReply;
	}

	private async handleShortenedURL(req: Request, reply: Reply) {
		const id = (req.params as any).id;

		const url = await this.urls.findOne({ id });

		if (!url) {
			return reply.callNotFound();
		}

		reply.redirect(301, url.destUrl);

		// Update stats.
		await this.urls.increment({ id }, 'redirects', 1);
	}

	private async handleGetFile(req: Request, reply: Reply) {
		const id = (req.params as any).id;
		const file = await this.getFile(id)

		if (!file) {
			reply.header("Content-Type", "text/plain");
			reply.status(404);
			return "Image not found!";
		}

		const mimetype = mime.getType(id.split(".")[1]);
		reply.header("Content-Type", mimetype);

		reply.send(file);
	}


	/// This is untyped due to the mimetype support we need.
	private async handleShareXUpload(req: any, reply: any) {
		if (!req.headers.authorization || req.headers.authorization !== process.env.UPLOAD_SECRET) {
			reply.status(401);
			reply.header("Content-Type", "text/plain");
			return "You are unable to access this endpoint.";
		}

		const data = await req.file();

		const token = randomString(7, false);
		const mimetype = mime.getExtension(data.mimetype);
		const fileBuffer = await data.toBuffer();

		const file = new FileEntry();

		const id = `${token}.${mimetype}`;

		file.id = token;
		file.mimetype = data.mimetype;
		file.uploadDate = new Date();
		file.buffer = fileBuffer;

		await this.files.save(file);
		await this.cacheFile(id, fileBuffer);
		this.app.log.info(`Cached file ${id.split(".")[0]}`);

		reply.header("Content-Type", "application/json");

		return {
			statusCode: 200,
			files: [
				{
					name: `${token}.${mimetype}`,
					url: `${req.protocol}://${req.hostname}/u/${id}`
				}
		]} as FileUploadReply;
	}

	private async getFile(id: string): Promise<Buffer> {
		const image = await this.redis.getBuffer(id);
		if (!image) {
			const fetchedImage = await this.files.findOne({ id: id.split(".")[0] }) as FileEntry;

			await this.redis.set(id, fetchedImage.buffer, "EX", 3600);
			this.app.log.info(`Cached file ${id.split(".")[0]}`);

			return fetchedImage.buffer;
		}

		return image;
	}

	private cacheFile(id: string, buffer: Buffer) {
		return this.redis.set(id, buffer, "EX", 3600);
	}
}

interface APIServiceOptions {
	port?: number;
}

export { APIService, APIServiceOptions };
