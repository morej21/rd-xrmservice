/* eslint-disable prefer-destructuring */
import { CrmEntity, ITypeConverter, Context, MapType } from '.';
import { Entity, EntityReference, OptionSetValue } from '../models';

export class CrmEntityConverter<
	TSource extends CrmEntity,
	TDestination extends Entity,
	K extends keyof TDestination
> implements ITypeConverter<TSource, TDestination[K]> {
	// eslint-disable-next-line class-methods-use-this
	Convert(context: Context<TSource, TDestination[K]>): TDestination[K] {
		const entityFrom = <TSource>context.SourceValue;
		const entityTo = <TDestination[K]>context.DestinationValue;
		const metaData = context.AttributeMetaData;
		const query = context.Query;

		entityTo.LogicalName = entityFrom.LogicalName;
		entityTo.PrimaryNameAttribute =
			metaData[entityFrom.LogicalName].PrimaryNameAttribute;
		entityTo.PrimaryIdAttribute =
			metaData[entityFrom.LogicalName].PrimaryIdAttribute;

		let id = entityFrom.Content[entityTo.PrimaryIdAttribute];
		if (!id) {
			let aliasPrimaryIdAttribute = Object.keys(entityFrom.Content).find(
				k => entityFrom.Content[k] === entityTo.PrimaryIdAttribute,
			);
			if (aliasPrimaryIdAttribute) {
				aliasPrimaryIdAttribute = aliasPrimaryIdAttribute.split('@')[0];
				id = entityFrom.Content[aliasPrimaryIdAttribute];
			}
		}
		entityTo.Id = id;

		Object.keys(entityFrom.Content).forEach(mf => {
			const originalvalue = entityFrom.Content[mf];
			let value: any = null;
			let mfBase = mf;
			const originalName =
				Object.keys(entityFrom.Content).find(
					a => `${mfBase}@OData.Community.Display.V1.AttributeName` === a,
				) ?? '';
			let linkedEntity: string | undefined;
			let fieldMetaData: any;

			fieldMetaData = metaData[entityFrom.LogicalName];
			// linkedentity
			if (!mf.toLowerCase().includes('@')) {
				const linked = mf.split('.');
				if (linked.length > 1) {
					linkedEntity = linked[0];
					mfBase = linked[1];
					fieldMetaData = metaData[linkedEntity];
				}
			}

			if (mf.startsWith('_') && mf.endsWith('_value'))
				mfBase = mf.substring(1).split('_value')[0];

			let type = fieldMetaData?.Attributes?.find(m => m.LogicalName === mfBase);
			if (!type) {
				if (originalName) {
					type = fieldMetaData?.Attributes?.find(
						m => m.LogicalName === entityFrom.Content[originalName],
					);
					if (!type) {
						// when aliased there is no backing link to [entity] attribute metadata but it has been provisioned in one of: look in all metadata
						// eslint-disable-next-line consistent-return
						// eslint-disable-next-line array-callback-return
						Object.keys(metaData).some(m => {
							type = metaData[m].Attributes.find(
								ma => ma.LogicalName === entityFrom.Content[originalName],
							);
							if (type) return true;
						});
					}
				}
			}
			// image Id  attribute
			// console.log(type)
			if (type) {
				switch (type['@odata.type']) {
					case MapType.String:
					case MapType.Memo:
						value = entityFrom.Content[mf];
						//  console.log("string found "+mf)
						break;
					case MapType.DateTime:
						value = entityFrom.Content[mf];
						// console.log("date found "+mf)
						break;
					case MapType.BigInt:
					case MapType.Decimal:
					case MapType.Double:
					case MapType.Money:
					case MapType.Integer:
						value = +entityFrom.Content[mf];
						// console.log("number found "+mf);
						break;
					case MapType.Lookup:
						// console.log(`_${ mf }_value@Microsoft.Dynamics.CRM.lookuplogicalname`);
						if (linkedEntity || originalName) {
							value = new EntityReference(
								entityFrom.Content[
									`${mf}@Microsoft.Dynamics.CRM.lookuplogicalname`
								],
								entityFrom.Content[`${mf}`],
								entityFrom.Content[
									`${mf}@OData.Community.Display.V1.FormattedValue`
								],
							);
						} else
							value = new EntityReference(
								entityFrom.Content[
									`_${mfBase}_value@Microsoft.Dynamics.CRM.lookuplogicalname`
								],
								entityFrom.Content[`_${mfBase}_value`],
								entityFrom.Content[
									`_${mfBase}_value@OData.Community.Display.V1.FormattedValue`
								],
							);
						break;
					case MapType.PickList:
					case MapType.State:
					case MapType.Status:
					case MapType.EntityName:
						value = new OptionSetValue(
							entityFrom.Content[mf],
							entityFrom.Content[
								`${mf}@OData.Community.Display.V1.FormattedValue`
							],
						);
						// console.log("picklist found " + mf);
						break;
					case MapType.TwoOptionSet:
						// console.log("boolean found "+ mf)
						// console.log(originalvalue);
						if (
							originalvalue === null ||
							+originalvalue === 0 ||
							!(<boolean>originalvalue)
						)
							value = new OptionSetValue(
								false,
								entityFrom.Content[
									`${mf}@OData.Community.Display.V1.FormattedValue`
								],
							);
						else
							value = new OptionSetValue(
								true,
								entityFrom.Content[
									`${mf}@OData.Community.Display.V1.FormattedValue`
								],
							);
						break;
					default:
						// ImageAttribute??
						value = entityFrom.Content[mf];
						// console.log("not mapped: " + type["@odata.type"] + " " + mf;
						break;
				}
				if (linkedEntity)
					entityTo[`${fieldMetaData.LogicalName}.${mfBase}`] = value;
				else entityTo[mfBase] = value;
			} else if (
				query?.ColumnSet &&
				query.ColumnSet.Columns &&
				query.ColumnSet.Columns.filter(c => c.Name === mf || c.Alias === mf)
					.length > 0
			) {
				// account for aggregated column values
				const column = context.Query?.ColumnSet.Columns.filter(
					c => c.Name === mf || c.Alias === mf,
				)[0];
				if (column) {
					const columName = column.Alias ? column.Alias : column.Name;
					if (columName) entityTo[columName] = entityFrom.Content[columName];
				}
			}
		});
		return entityTo;
	}
}
