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

import { FileEntry, ShortenedURL, AccountEntry } from "./entities";
import { FileUploadReply, ShortenedURLReply } from "./structs";
import { randomString } from "./util/randomString";
import { Logger } from "@ayanaware/logger";

import * as mime from "mime";
import * as redis from "ioredis";

const logger = Logger.get();

class APIService {
	public port: number;
	public db: Connection;
	public files: Repository<FileEntry>;
	public accounts: Repository<AccountEntry>;
	public urls: Repository<ShortenedURL>;
	public redis: redis.Redis = new redis(); // TODO: Parse login information.

	public constructor(public app: FastifyInstance, options?: APIServiceOptions) {
		this.port = options.port || parseInt(process.env.PORT);
		this.app.register(require("fastify-multipart"));

		/// Setup our routes here.
		this.app.post("/api/providers/sharex", this.handleShareXUpload.bind(this));
		this.app.post("/api/providers/shortener", this.shortenURL.bind(this));

		/// View statistics.
		this.app.get("/api/providers/shortener/:id", this.viewShortenURL.bind(this));
		this.app.get("/api/providers/sharex/:id", this.viewShareXUpload.bind(this));

		/// For uploaded content.
		this.app.get("/u/:id", this.handleGetFile.bind(this));
		this.app.get("/view/:id", this.handleFullGetFile.bind(this));

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
					ShortenedURL,
					AccountEntry
				]
			});
		})().then(() => {
			this.files = getRepository(FileEntry);
			this.urls = getRepository(ShortenedURL);
			this.accounts = getRepository(AccountEntry);
		});
	}

	public listen() {
		try {
			this.app.listen(this.port);
			logger.info(`Server listening on port ${this.port}`);
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

	private async handleFullGetFile(req: Request, reply: any) {
		const id = (req.params as any).id;
		const file = await this.files.findOne({ id: id.split(".")[0] })

		if (!file) {
			reply.header("Content-Type", "text/plain");
			reply.status(404);
			return "Image not found!";
		}

		const account = await this.accounts.findOne({ id: file.uploadedBy });

		reply.view("../views/View.ejs", { 
			image: `https://${process.env.HOSTNAME}/u/${id}`,
			url: `https://${process.env.HOSTNAME}/view/${id}`,
			title: account.embed_title,
			color: account.embed_color,
			username: account.embed_username,
			fileName: id,
			host: process.env.HOSTNAME
		});
	}


	/// This is untyped due to the mimetype support we need.
	private async handleShareXUpload(req: any, reply: any) {
		const account = await this.accounts.findOne({ id: req.headers.authorization });
		if (!account) {
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
		file.uploadedBy = account.id;

		await this.files.save(file);
		await this.cacheFile(id, fileBuffer);
		logger.info(`Cached file ${id.split(".")[0]} uploaded by user ${account.user}`);

		reply.header("Content-Type", "application/json");

		return {
			statusCode: 200,
			files: [
				{
					name: `${token}.${mimetype}`,
					url: `${req.protocol}://${req.hostname}/view/${id}`
		
				}
		]} as FileUploadReply;
	}

	private async getFile(id: string): Promise<Buffer> {
		const image = await this.redis.getBuffer(id);
		if (!image) {
			const fetchedImage = await this.files.findOne({ id: id.split(".")[0] }) as FileEntry;

			await this.redis.set(id, fetchedImage.buffer, "EX", 3600);
			logger.info(`Cached file ${id.split(".")[0]} uploaded by ${fetchedImage.uploadedBy}`);

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
