import { XrmQuery } from 'rd-xrmquery/lib/';

export interface ITypeConverter<TSource, TDestination> {
	Convert(context: Context<TSource, TDestination>): TDestination;
}
export class Context<TSource, TDestination> {
	SourceValue: TSource | undefined;

	DestinationValue: TDestination | undefined;

	AttributeMetaData: any;

	LookupMetaData: any;

	EntityMetaData: any;

	Query: XrmQuery | undefined;
}
