import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity()
export class AccountEntry {
	@PrimaryColumn()
	user: string;

	@Column()
	id: string;

	@Column({ type: "timestamp" })
	createdAt: Date;

	@Column({ default: "Person" })
	embed_username: string;

	@Column({ default: "#ff2a6d" })
	embed_color: string;

	@Column({ default: "Voidchan Uploads" })
	embed_title: string;

	@Column({ array: true, type: "text", default: null })
	registeredDomains: string[];
}
