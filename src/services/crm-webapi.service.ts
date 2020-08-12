/* eslint-disable no-param-reassign */
/* eslint-disable import/prefer-default-export */
import { Observable } from 'rxjs';
import { ajax } from 'rxjs/ajax';
import { map, catchError } from 'rxjs/operators';
import { XrmImage } from '../models';

export interface Credentials {
	Token: string;
}

export class CrmWebapiService {
	cred: Credentials | undefined;

	constructor(clientUrl: string);

	constructor(clientUrl: string, token: string);

	constructor(private clientUrl: string, private token?: string) {}

	public executeFetch(
		entitySetName: string,
		fetchXml: string,
	): Observable<any> {
		return this.retrieve(`${entitySetName}?fetchXml=${fetchXml}`);
	}

	public GetAuthorizedHeader(header: any) {
		if (this.token) header.Authorization = `Bearer ${this.token}`;
		return header;
	}

	public getImage(
		entitySetName: string,
		imageAttribute: string,
		entityId: string,
		thumbNail: boolean | false,
	): Observable<XrmImage> {
		const headers = this.GetAuthorizedHeader({
			Accept: 'application/octet-stream',
			'Content-Type': 'application/octet-stream',
		});

		return ajax({
			// eslint-disable-next-line prettier/prettier
			url: `${this.getWebAPIPath()}${entitySetName}(${entityId})/${imageAttribute}/$value${
				!thumbNail ? '?size=full' : ''
			}`,
			headers,
			responseType: 'arraybuffer',
		}).pipe(
			map(ar => {
				const image = new XrmImage();
				if (!thumbNail)
					image.fileName = ar.xhr.getResponseHeader('x-ms-file-name');
				image.imageArrayBuffer = ar.response;
				return image;
			}),
		);
	}

	public updateImage(
		entitySetName: string,
		imageAttribute: string,
		entityId: string,
		image: XrmImage,
	): Observable<any> {
		const headers = this.GetAuthorizedHeader({
			Accept: 'application/octet-stream',
			'Content-Type': 'application/octet-stream',
			'x-ms-file-name': image.fileName,
		});

		return ajax({
			url: `${this.getWebAPIPath()}${entitySetName}(${entityId})/${imageAttribute}`,
			headers,
			body: image.imageArrayBuffer,
			method: 'PUT',
		});
	}

	public createRecord(entitySetName: string, attributes: any): Observable<any> {
		const headers = this.GetAuthorizedHeader({
			'Content-Type': 'application/json; charset=utf-8',
			Accept: 'application/json',
			'OData-MaxVersion': '4.0',
			'OData-Version': '4.0',
		});

		return ajax({
			headers,
			url: this.getWebAPIPath() + entitySetName,
			body: JSON.stringify(attributes),
			method: 'POST',
		}).pipe(
			map(response => {
				if (response.status === 201) {
					return response;
				}
				if (response.status === 204) {
					let entityId = response.xhr.getResponseHeader('odata-entityid');
					if (entityId) {
						entityId = entityId
							.substring(entityId.indexOf('(') + 1)
							.substring(0, 36);
						return entityId;
					}
				}
				return null;
			}),
		);
	}

	public updateRecord(
		entitySetName: string,
		id: string,
		attributes: any,
	): Observable<any> {
		const headers = this.GetAuthorizedHeader({
			'Content-Type': 'application/json; charset=utf-8',
			Accept: 'application/json',
			'OData-MaxVersion': '4.0',
			'OData-Version': '4.0',
		});

		id = id.replace('{', '').replace('}', '');
		const queryString = `${entitySetName}(${id})`;
		return ajax
			.patch(
				this.getWebAPIPath() + queryString,
				JSON.stringify(attributes),
				headers,
			)
			.pipe(
				map(response => {
					return response;
				}),
				catchError(error => {
					return Observable.throw({
						source: 'Crm Service updateRecord',
						message: error.error ? error.error.error.message : error.message,
					});
				}),
			);
	}

	public deleteRecord(entitySetName: string, id: string): Observable<any> {
		const queryString = `${entitySetName}(${id})`;
		const headers = this.GetAuthorizedHeader({
			'Content-Type': 'application/json; charset=utf-8',
			Accept: 'application/json',
			'OData-MaxVersion': '4.0',
			'OData-Version': '4.0',
		});
		return ajax.delete(this.getWebAPIPath() + queryString, headers).pipe(
			map(response => {
				return response;
			}),
		);
	}

	public associateRecord(
		entitySetName: string,
		entityId: string,
		relationShip: string,
		relEntitySetName: string,
		relEntityId: string,
	) {
		const headers = this.GetAuthorizedHeader({
			'Content-Type': 'application/json; charset=utf-8',
			Accept: 'application/json',
			'OData-MaxVersion': '4.0',
			'OData-Version': '4.0',
		});

		const association = {
			'@odata.id': `${this.getWebAPIPath() + entitySetName}(${entityId})`,
		};
		return ajax({
			headers,
			url: `${this.getWebAPIPath()}${relEntitySetName}(${relEntityId})/${relationShip}/$ref`,
			body: JSON.stringify(association),
			method: 'POST',
		});
	}

	public retrieveMetaData(logicalName: string, attributes?: string[]) {
		const entityDefinition = `EntityDefinitions(LogicalName='${logicalName}')`;
		const select =
			'?$select=LogicalName,PrimaryNameAttribute,PrimaryIdAttribute,CollectionSchemaName,LogicalCollectionName,EntitySetName';
		let expand = '';
		if (attributes && attributes.length > 0)
			// eslint-disable-next-line prettier/prettier
			expand = `&$expand=Attributes($select=LogicalName,SchemaName,IsCustomAttribute${
				attributes
					? `;$filter=Microsoft.Dynamics.CRM.In(PropertyName='LogicalName',PropertyValues=[${attributes
							.map(a => `'${a}'`)
							.join(',')}])`
					: ''
			})`;
		else
			expand =
				'&$expand=Attributes($select=LogicalName,SchemaName,IsCustomAttribute)';
		const queryString = entityDefinition + select + expand;
		return this.retrieve(queryString);
	}

	public retrieveEntityMetaData(...logicalNames: string[]) {
		let queryString = 'EntityDefinitions';
		queryString +=
			'?$select=LogicalName,PrimaryNameAttribute,PrimaryIdAttribute,CollectionSchemaName,LogicalCollectionName,EntitySetName';
		if (logicalNames && logicalNames.length > 0)
			queryString += `&$filter=Microsoft.Dynamics.CRM.In(PropertyName='LogicalName',PropertyValues=[${logicalNames
				.map(l => `'${l}'`)
				.join(',')}])`;

		return this.retrieve(queryString).pipe(map(b => b.value));
	}

	public retrieveFullEntityMetaData(...logicalNames: string[]) {
		let queryString = 'EntityDefinitions';
		queryString +=
			'?$select=LogicalName,PrimaryNameAttribute,PrimaryIdAttribute,CollectionSchemaName,LogicalCollectionName,EntitySetName&$expand=Attributes($select=LogicalName,SchemaName,IsCustomAttribute)';
		if (logicalNames && logicalNames.length > 0)
			queryString += `&$filter=Microsoft.Dynamics.CRM.In(PropertyName='LogicalName',PropertyValues=[${logicalNames
				.map(l => `'${l}'`)
				.join(',')}])`;

		return this.retrieve(queryString).pipe(map(b => b.value));
	}

	public retrieveLookupMetaData(logicalName: string) {
		const queryString = `EntityDefinitions(LogicalName='${logicalName}')/Attributes/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,Targets`;
		return this.retrieve(queryString).pipe(map(b => b.value));
	}

	private retrieve(queryString): Observable<any> {
		return ajax.getJSON(
			`${this.getWebAPIPath()}${queryString}`,
			this.getJSONHeaders(),
		);
	}

	public retrieveEntityMetaDataRelationShipDetails(
		entity1: string,
		entity2: string,
	) {
		const queryString = `RelationshipDefinitions/Microsoft.Dynamics.CRM.ManyToManyRelationshipMetadata?$select=SchemaName,IntersectEntityName,Entity1IntersectAttribute,Entity2IntersectAttribute&$filter=(Entity1LogicalName eq '${entity1}'  and Entity2LogicalName eq '${entity2}') or (Entity1LogicalName eq '${entity2}' and Entity2LogicalName eq '${entity1}')`;
		return this.retrieve(queryString).pipe(map(b => b.value));
	}

	public retrieveReferencingAttribute(
		referencingEntity: string,
		referencedEntity: string,
	) {
		const queryString: string = `RelationshipDefinitions/Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata?$select=ReferencingAttribute&$filter=ReferencedEntity eq '${referencedEntity}' and ReferencingEntity eq '${referencingEntity}'`;
		return this.retrieve(queryString).pipe(map(b => b.value));
	}

	private getJSONHeaders(): any {
		const headers = this.GetAuthorizedHeader({
			'OData-MaxVersion': '4.0',
			'OData-Version': '4.0',
			Prefer: 'odata.include-annotations=*',
		});
		return headers;
	}

	private getWebAPIPath() {
		return `${this.clientUrl}/api/data/v9.1/`;
	}
}
