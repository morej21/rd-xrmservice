/* eslint-disable import/prefer-default-export */
import { Observable, of, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { XrmQuery, XrmLinkEntity } from 'rd-xrmquery/lib/';

import { CrmWebapiService } from './crm-webapi.service';
import { Entity } from '../models';

export class MetaDataService {
	constructor(private crmService: CrmWebapiService) {}

	private entityCache: any = {};

	public initEntityMetaDataCache(...entities: string[]) {
		return this.crmService.retrieveFullEntityMetaData(...entities).pipe(
			map(r => {
				const arr = <any[]>r;
				arr.forEach(e => {
					if (!this.entityCache[e.LogicalName]) {
						this.entityCache[e.LogicalName] = e;
					}
				});
			}),
		);
	}

	public retrieveAttributeMetaData(
		logicalName: string,
		attributes?: string[],
	): Observable<any> {
		if (this.entityCache[logicalName]) {
			const clone = { ...this.entityCache[logicalName] };
			return of(clone);
		}
		return this.crmService.retrieveMetaData(logicalName, attributes);
	}

	public retrieveEntityMetaData(...entities: string[]): Observable<any> {
		const observableArray: Observable<any>[] = [];
		const unCachedEntities: string[] = [];

		entities.forEach(e => {
			if (this.entityCache[e]) {
				const clone = { ...this.entityCache[e] };
				observableArray.push(of([clone]));
			} else {
				unCachedEntities.push(e);
			}
		});
		if (unCachedEntities.length > 0)
			observableArray.push(
				this.crmService.retrieveEntityMetaData(...unCachedEntities),
			);
		return forkJoin(observableArray).pipe(
			map(result => {
				const returnArray = [];
				result.forEach(r => {
					(<[]>r).forEach(re => returnArray.push(re));
				});
				return returnArray;
			}),
		);
	}

	private getAttributeMetaData(
		entityName: string,
		entityAlias?: string,
		attributes?: string[],
	): Observable<any> {
		if (this.entityCache[entityName]) {
			const clone = { ...this.entityCache[entityName] };
			if (entityAlias) clone.LogicalName = entityAlias;
			return of(clone);
		}
		// attributes
		return this.crmService.retrieveMetaData(entityName, attributes).pipe(
			map(m => {
				const returnMetaData = m;
				if (entityAlias) returnMetaData.LogicalName = entityAlias;
				return returnMetaData;
			}),
		);
	}

	public retrieveLookUpMetaData(logicalName: string): Observable<any> {
		return this.crmService.retrieveLookupMetaData(logicalName);
	}

	public getMetaDataByQuery(query: XrmQuery): Observable<any>[] {
		const observables: Observable<any>[] = [];
		this.retrieveAttributeMetaDataByQuery(query).forEach(o =>
			observables.push(o),
		); // metadata
		return observables;
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

	private getRelatedMetadata(
		link: XrmLinkEntity,
		metaDataObservables: Observable<any>[],
		entities: string[],
	) {
		if (link.LinkToEntityName) {
			let entityAlias: string = link.EntityAlias;
			if (!entityAlias) entityAlias = link.LinkToEntityName + entities.length;
			entities.push(link.LinkToEntityName + entities.length);
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
