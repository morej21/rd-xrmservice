/* eslint-disable prettier/prettier */
import { SourceEntity } from '.';

export class CrmEntity extends SourceEntity {
	[key: number]: any;

	[key: string]: any;

	LogicalName: string;

	constructor(content: any, logicalname: string) {
		super(content);
		this.LogicalName = logicalname;
	}
}
