import { EntityReference } from '.';

export class Entity {
	[key: number]: any;

	[key: string]: any;

	Id: string | undefined;

	LogicalName: string | undefined;

	PrimaryNameAttribute: string | undefined;

	PrimaryIdAttribute: string | undefined;

	constructor();

	constructor(entityName: string);

	constructor(entityName: string, id: string);

	constructor(entityName?: string, id?: string) {
		this.Id = id;
		this.LogicalName = entityName;
	}

	public GetAttributeValue<T>(attributeLogicalName: string) {
		return <T>this[attributeLogicalName];
	}

	public ToEntityReference();

	public ToEntityReference(name?: string) {
		if (this.LogicalName && this.Id)
			return new EntityReference(
				this.LogicalName,
				this.Id,
				name ||
					(this.PrimaryNameAttribute
						? this[this.PrimaryNameAttribute]
						: undefined),
			);
	}
}
