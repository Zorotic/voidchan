import { cpuUsage } from "process";
import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity()
export class FileEntry {
	@PrimaryColumn()
	id: string;
	
	@Column()
	mimetype: string;

	@Column({ type: "bytea" })
	buffer: Buffer;

	@Column({ type: "timestamp" })
	uploadDate: Date;

	@Column({ default: 0 })
	views: number;
}
