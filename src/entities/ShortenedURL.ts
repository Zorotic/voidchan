import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity()
export class ShortenedURL {
	@PrimaryColumn()
	id: string;

	@Column({ default: 0 })
	redirects: number;

	@Column()
	destUrl: string;
}
