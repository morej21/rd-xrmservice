/* eslint-disable import/prefer-default-export */
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { XrmQuery, XrmLinkEntity } from 'rd-xrmquery/lib/';

import { CrmWebapiService } from './crm-webapi.service';
import { Entity } from '../models';

export class MetaDataService {
	constructor(private crmService: CrmWebapiService) {}

	public getMetaDataByQuery(query: XrmQuery): Observable<any>[] {
		const observables: Observable<any>[] = [];
		this.retrieveAttributeMetaDataByQuery(query).forEach(o =>
			observables.push(o),
		); // metadata
		return observables;
	}

	public retrieveAttributeMetaData(
		logicalName: string,
		attributes?: string[],
	): Observable<any> {
		return this.crmService.retrieveMetaData(logicalName, attributes);
	}

	public retrieveEntityMetaData(...entities: string[]): Observable<any> {
		return this.crmService.retrieveEntityMetaData(entities);
	}

	public retrieveLookUpMetaData(logicalName: string): Observable<any> {
		return this.crmService.retrieveLookupMetaData(logicalName);
	}

	public retrieveAttributeMetaDataByQuery(query: XrmQuery): Observable<any>[] {
		const entities: string[] = [];
		entities.push(query.EntityName);
		const metaDataObservables: Observable<any>[] = [];
		if (query.EntityName) {
			if (query.ColumnSet.AllColumns)
				metaDataObservables.push(this.getAttributeMetaData(query.EntityName));
			else
				metaDataObservables.push(
					this.getAttributeMetaData(
						query.EntityName,
						undefined,
						query.ColumnSet.Columns.map(c => c.Name ?? ''),
					),
				); // per documentation: optional parameter assignment does not yet exist
		}
		query.LinkEntities.forEach(l => {
			this.getRelatedMetadata(l, metaDataObservables, entities);
		});
		return metaDataObservables;
	}

	private getAttributeMetaData(
		entityName: string,
		entityAlias?: string,
		attributes?: string[],
	): Observable<any> {
		// attributes
		return this.crmService.retrieveMetaData(entityName, attributes).pipe(
			map(m => {
				if (entityAlias) m.LogicalName = entityAlias;
				return m;
			}),
		);
	}

	private getRelatedMetadata(
		link: XrmLinkEntity,
		metaDataObservables: Observable<any>[],
		entities: string[],
	) {
		if (link.LinkToEntityName) {
			let entityAlias: string = link.EntityAlias;
			if (!entityAlias) {
				const entlength = entities.filter(e => e === link.LinkToEntityName)
					.length;
				entityAlias = link.LinkToEntityName + (entlength + 1);
				entities.push(link.LinkToEntityName);
			}
			if (link.ColumnSet.AllColumns) {
				metaDataObservables.push(
					this.getAttributeMetaData(link.LinkToEntityName, entityAlias),
				);
			} else {
				metaDataObservables.push(
					this.getAttributeMetaData(
						link.LinkToEntityName,
						entityAlias,
						link.ColumnSet.Columns.map(c => c.Name ?? ''),
					),
				);
			}
		}
		link.LinkEntities.forEach(l =>
			this.getRelatedMetadata(l, metaDataObservables, entities),
		);
	}

	public getEntityRelatedMetadata(entity: Entity) {
		const entityName = entity.LogicalName ?? '';
		const attributes = Object.keys(entity);
		const lookupEntities = attributes
			.filter(k => (entity[k] ? entity[k].LogicalName : false))
			.map(k => <string>entity[k].LogicalName);

		const observables: Observable<any>[] = [];
		observables.push(this.retrieveAttributeMetaData(entityName, attributes));
		observables.push(this.retrieveLookUpMetaData(entityName));
		if (lookupEntities && lookupEntities.length > 0)
			observables.push(this.retrieveEntityMetaData(...lookupEntities));
		return observables;
	}
}
