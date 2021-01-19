import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity()
export class AccountEntry {
	@PrimaryColumn()
	user: string;

	@Column()
	id: string;

	@Column({ type: "timestamp" })
	createdAt: Date;
}
