import { Entity, PrimaryColumn, Column, JoinColumn, OneToOne } from "typeorm";


type AccountId = string;

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

	@Column()
	uploadedBy: AccountId;
}
