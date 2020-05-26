export class EntityReference {
	Id: string | undefined;

	LogicalName: string | undefined;

	Name: string | undefined;

	constructor();

	constructor(logicalName: string);

	constructor(logicalName: string, id: string);

	constructor(logicalName: string, id: string, name: string);

	constructor(entityName?: string, id?: string, name?: string) {
		this.Id = id;
		this.LogicalName = entityName;
		this.Name = name;
	}
}
