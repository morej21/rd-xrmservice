import { Entity } from '.';

export class EntityCollection {
	public Entities: Entity[] = [];

	public EntityName: string | undefined;

	public MoreRecords: boolean | undefined;

	public PagingCookie: string | undefined;

	public TotalRecordCount: number | undefined;

	public TotalRecordCountLimitExceeded: boolean | undefined;
}
