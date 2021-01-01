import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity()
export class ShortenedURL {
	@PrimaryColumn()
	id: string;

	@Column()
	redirects: number;

	@Column()
	destUrl: string;
}
