/* eslint-disable import/prefer-default-export */
import { ajax } from 'rxjs/ajax';
import { map } from 'rxjs/operators';

export class LoginService {
	getToken(resource: string) {
		return ajax
			.get(`${this.getWebAPIPath()}?resource=${resource}`)
			.pipe(map(ar => ar.response));
	}

	private getWebAPIPath() {
		return 'https://sudokuservice.azurewebsites.net/vesta/services/vestamaster.svc/rest/json/gettokenwithresource';
	}
}
