import { CrmEntity, ITypeConverter, Context, MapType } from '.';
import { Entity, OptionSetValue, EntityReference } from '../models';

export class ApiEntityConverter<
	TSource extends Entity,
	TDestination extends CrmEntity
> implements ITypeConverter<TSource, TDestination> {
	// eslint-disable-next-line class-methods-use-this
	Convert(context: Context<TSource, TDestination>): TDestination {
		const apiEntity: any = {};
		const entity = <Entity>context.SourceValue;
		const attributes = context.AttributeMetaData.Attributes;
		const entities = context.EntityMetaData;
		const lookups = context.LookupMetaData;
		const destination = <TDestination>context.DestinationValue;

		Object.keys(entity).forEach(a => {
			const attrDetail = attributes.find(
				m => m.LogicalName.toLowerCase() === a,
			);
			if (attrDetail && attrDetail['@odata.type']) {
				switch (attrDetail && attrDetail['@odata.type']) {
					case MapType.String:
					case MapType.Memo:
						apiEntity[attrDetail.LogicalName] = entity[a];
						break;
					case MapType.DateTime: // check date!!!
						apiEntity[a] = entity[a] ? new Date(entity[a]).toISOString() : null;
						break;
					case MapType.Money:
					case MapType.Decimal:
						apiEntity[a] = entity[a] ? parseFloat(entity[a].toString()) : 0;
						break;
					case MapType.BigInt:
					case MapType.Double:
					case MapType.Integer:
						apiEntity[a] = entity[a] ? entity[a] : 0;
						break;
					case MapType.Lookup: {
						// inconsistent when it comes to naming of binding value: core lookup always lower case, custom lookup schemaname(case sensitive!)
						// quote["rdiac_PolicyHolder@odata.bind"] = String.Format("/contacts({0})", contactid);
						// quote["customerid_contact@odata.bind"] = String.Format("/contacts({0})", contactid);
						const entRef = entity.GetAttributeValue<EntityReference>(a);
						if (entRef) {
							const entityDetail = entities.find(
								e => e.LogicalName.toLowerCase() === entRef.LogicalName,
							);
							const lookupDetail = lookups.find(
								l => l.LogicalName.toLowerCase() === a,
							);
							if (lookupDetail.Targets.length > 1)
								// eg customer can be account or contact
								apiEntity[
									`${
										attrDetail.IsCustomAttribute
											? attrDetail.SchemaName
											: attrDetail.LogicalName
									}_${entRef.LogicalName}@odata.bind`
								] = `/${entityDetail.LogicalCollectionName}(${entRef.Id})`;
							else
								apiEntity[
									`${
										attrDetail.IsCustomAttribute
											? attrDetail.SchemaName
											: attrDetail.LogicalName
									}@odata.bind`
								] = `/${entityDetail.LogicalCollectionName}(${entRef.Id})`;
						}
						break;
					}
					case MapType.PickList:
					case MapType.State:
					case MapType.Status:
					case MapType.EntityName:
					case MapType.TwoOptionSet:
						if (typeof entity[a] === 'boolean' || typeof entity[a] === 'number')
							// account for two optionset to be passed as boolean or multi as a number.
							apiEntity[a] = entity[a];
						else if (entity[a])
							apiEntity[a] = entity.GetAttributeValue<OptionSetValue>(a).Value;
						else apiEntity[a] = null;
						break;
					default:
						// console.log("not mapped: " + type["@odata.type"] + " " + mf;
						break;
				}
			}
		});
		// console.log(apiEntity);
		destination.Content = apiEntity;
		return destination;
	}
}
