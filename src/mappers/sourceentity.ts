export abstract class SourceEntity {
	constructor(content: any) {
		this.Content = content;
	}

	Content: any;
}
export class CrmEntity extends SourceEntity {
	LogicalName: string;

	constructor(content: any, logicalname: string) {
		super(content);
		this.LogicalName = logicalname;
	}
}
