/* eslint-disable import/prefer-default-export */
import { XrmQuery } from 'rd-xrmquery/lib/';
import {
	CrmEntityConverter,
	CrmEntity,
	Context,
	ApiEntityConverter,
} from '../mappers';
import { Entity } from '../models';

export class EntityMapperService {
	// refactor to be more generic
	private converter = new CrmEntityConverter();

	private apiconverter = new ApiEntityConverter();

	MapCrm(source: CrmEntity[], q: XrmQuery, metaData: any): Entity[] {
		const returnEntities: Entity[] = [];
		source.forEach(s => {
			const context = new Context<CrmEntity, Entity>();
			context.SourceValue = s;
			context.DestinationValue = new Entity();
			context.AttributeMetaData = metaData;
			context.Query = q;
			returnEntities.push(this.converter.Convert(context));
		});
		return returnEntities;
	}

	MapApi(
		source: Entity[],
		attributeMetaData: any,
		lookupMetaData: any,
		entityMetaData: any,
	): CrmEntity[] {
		const returnEntities: CrmEntity[] = [];
		source.forEach(s => {
			const context = new Context<Entity, CrmEntity>();
			context.SourceValue = s;
			context.AttributeMetaData = attributeMetaData;
			context.LookupMetaData = lookupMetaData;
			context.EntityMetaData = entityMetaData;
			context.DestinationValue = new CrmEntity(null, s.LogicalName ?? '');
			returnEntities.push(this.apiconverter.Convert(context));
		});
		return returnEntities;
	}
}
