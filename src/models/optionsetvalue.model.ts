export class OptionSetValue {
	constructor(value: any, name: string);

	constructor(value: any, name: string, displayorder: number);

	constructor(value: any, name: string, displayorder?: number) {
		this.Value = value;
		this.Name = name;
		this.DisplayOrder = displayorder;
	}

	Value: any;

	Name: string;

	DisplayOrder: number | undefined;
}
