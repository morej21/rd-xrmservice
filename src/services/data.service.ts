/* eslint-disable import/prefer-default-export */
import { map, mergeMap, take } from 'rxjs/operators';
import { Observable, forkJoin } from 'rxjs';

import { XrmQuery, XrmColumnSet, ConditionOperator } from 'rd-xrmquery/lib';
import {
	OptionSetValue,
	EntityCollection,
	Entity,
	XrmImage,
	EntityReference,
} from '../models';
import { MetaDataService } from './metadata.service';
import { CrmWebapiService } from './crm-webapi.service';
import { EntityMapperService } from './entitymapper.service';
import { Base64 } from '../common/Base64';
import { CrmEntity } from '../mappers';

export class DataService {
	public apiService: CrmWebapiService;

	private metaDataService: MetaDataService;

	private entityMapperService: EntityMapperService;

	constructor(clientUrl: string);

	constructor(clientUrl: string, token: string);

	constructor(private clientUrl: string, private token?: string) {
		this.apiService = new CrmWebapiService(this.clientUrl, this.token ?? '');
		this.metaDataService = new MetaDataService(this.apiService);
		this.entityMapperService = new EntityMapperService();
	}

	public GetImage(
		entityName: string,
		imageAttribute: string,
		entityId: string,
	): Observable<XrmImage> {
		return this.metaDataService.retrieveEntityMetaData(entityName).pipe(
			mergeMap(em =>
				this.apiService
					.getImage(em[0].EntitySetName, imageAttribute, entityId)
					.pipe(
						map(i => {
							i.image = Base64.arrayBufferToBase64(
								i.imageArrayBuffer,
								i.fileName,
							);
							return i;
						}),
					),
			),
		);
	}

	public UpdateImage(
		entityName: string,
		imageAttribute: string,
		entityId: string,
		image: XrmImage,
	) {
		return this.metaDataService
			.retrieveEntityMetaData(entityName)
			.pipe(
				mergeMap(em =>
					this.apiService.updateImage(
						em[0].EntitySetName,
						imageAttribute,
						entityId,
						image,
					),
				),
			);
	}

	public RetrieveMultiple(query: XrmQuery): Observable<EntityCollection> {
		return forkJoin(this.metaDataService.getMetaDataByQuery(query))
			.pipe(
				mergeMap(metadata => {
					const entityMetada = metadata[0];
					return this.apiService
						.executeFetch(entityMetada.EntitySetName, query.GetFetchXml())
						.pipe(map(e => [e, ...metadata]));
				}),
			)
			.pipe(
				map(results => {
					const returnEntityCollection = new EntityCollection();
					returnEntityCollection.EntityName = query.EntityName;
					const fullArray = results;
					const metaData: any = {};
					fullArray.slice(1).forEach(m => {
						if (m) metaData[m.LogicalName] = m;
					});
					const responseBody = results[0];

					if (responseBody['@Microsoft.Dynamics.CRM.fetchxmlpagingcookie'])
						returnEntityCollection.PagingCookie =
							responseBody['@Microsoft.Dynamics.CRM.fetchxmlpagingcookie'];
					if (responseBody['@Microsoft.Dynamics.CRM.morerecords'])
						returnEntityCollection.MoreRecords = true;
					else returnEntityCollection.MoreRecords = false;
					if (responseBody['@Microsoft.Dynamics.CRM.totalrecordcount'])
						returnEntityCollection.TotalRecordCount =
							responseBody['@Microsoft.Dynamics.CRM.totalrecordcount'];
					if (
						responseBody[
							'@Microsoft.Dynamics.CRM.totalrecordcountlimitexceeded'
						]
					)
						returnEntityCollection.TotalRecordCountLimitExceeded = true;
					else returnEntityCollection.TotalRecordCountLimitExceeded = false;
					returnEntityCollection.Entities = this.entityMapperService.MapCrm(
						results[0].value.map(e => new CrmEntity(e, query.EntityName)),
						query,
						metaData,
					);
					return returnEntityCollection;
				}),
			);
	}

	public GetOptionSetValues(
		entitycode: string,
		attribute: string,
	): Observable<OptionSetValue[]> {
		const q = new XrmQuery('stringmap');
		q.ColumnSet = XrmColumnSet.FromColumns(
			'attributevalue',
			'value',
			'displayorder',
		);
		q.Criteria.AddCondition(
			'objecttypecode',
			ConditionOperator.Equal,
			entitycode,
		);
		q.Criteria.AddCondition(
			'attributename',
			ConditionOperator.Equal,
			attribute,
		);
		return this.RetrieveMultiple(q).pipe(
			map(ents =>
				ents.Entities.map(
					e => new OptionSetValue(e.attributevalue, e.value, e.displayorder),
				),
			),
		);
	}

	public Retrieve(
		entityName: string,
		id: string,
		columnSet: XrmColumnSet,
	): Observable<Entity> {
		const q = new XrmQuery(entityName);
		q.ColumnSet = columnSet;
		q.Criteria.AddCondition(`${entityName}id`, ConditionOperator.Equal, id);
		return this.RetrieveMultiple(q).pipe(map(e => e.Entities[0]));
	}

	public Delete(entityName: string, guid: string) {
		return this.metaDataService
			.retrieveEntityMetaData(entityName)
			.pipe(
				mergeMap(m => this.apiService.deleteRecord(m[0].EntitySetName, guid)),
			);
	}

	public Create(entity: Entity): Observable<any> {
		return this.getApiEntity(entity).pipe(
			mergeMap(ents =>
				this.apiService.createRecord(ents[1].EntitySetName, ents[0][0].Content),
			),
		);
	}

	public Update(entity: Entity): Observable<any> {
		return this.getApiEntity(entity).pipe(
			mergeMap(ents =>
				this.apiService.updateRecord(
					ents[1].EntitySetName,
					entity.Id ?? '',
					ents[0][0].Content,
				),
			),
		);
	}

	public Associate(
		entityName: string,
		entityId: string,
		relationship: string,
		...relatedEntities: EntityReference[]
	) {
		const entities = [
			...new Set(relatedEntities.map(e => e.LogicalName ?? '')),
		]; // Set = distinct ~ hashtable?
		if (!entities.includes(entityName)) entities.push(entityName);

		return this.metaDataService
			.retrieveEntityMetaData(...entities)
			.pipe(
				mergeMap(em => {
					const associateObservables: Observable<any>[] = [];
					relatedEntities.forEach(re =>
						associateObservables.push(
							this.apiService.associateRecord(
								em
									.filter(m => m.LogicalName === entityName)
									.map(m => m.EntitySetName)[0],
								entityId,
								relationship,
								em
									.filter(m => m.LogicalName === re.LogicalName)
									.map(m => m.EntitySetName)[0],
								re.Id ?? '',
							),
						),
					);
					return forkJoin(associateObservables);
				}),
			)
			.pipe(take(1));
	}

	private getApiEntity(entity: Entity): Observable<CrmEntity[]> {
		return forkJoin(this.metaDataService.getEntityRelatedMetadata(entity)).pipe(
			map(m => [
				this.entityMapperService.MapApi([entity], m[0], m[1], m[2]),
				...m,
			]),
		);
	}
}
