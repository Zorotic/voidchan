export interface FileUploadReply {
	statusCode: number;
	files: Array<FileReply>
}

export interface FileReply {
	name: string;
	url: string;
}