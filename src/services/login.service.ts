/* eslint-disable import/prefer-default-export */
import { ajax } from 'rxjs/ajax';
import { map } from 'rxjs/operators';

export class LoginService {
	getToken(resource: string) {
		return ajax.get(`${this.getWebAPIPath()}?resource=${resource}`).pipe(
			map(ar => {
				return ar.response.access_token;
			}),
		);
	}

	// eslint-disable-next-line class-methods-use-this
	private getWebAPIPath() {
		return '';
	}
}
