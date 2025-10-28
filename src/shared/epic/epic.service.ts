import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import * as qs from 'qs';

@Injectable()
export class EpicService {
  private clientId = process.env.EPIC_CLIENT_ID ?? '';
  private redirectUri = process.env.EPIC_REDIRECT_URI ?? '';
  private fhirBaseUrl = process.env.EPIC_FHIR_BASE_URL ?? '';

  generatePkce() {
    const code_verifier = crypto.randomBytes(64).toString('hex');
    const code_challenge = crypto
      .createHash('sha256')
      .update(code_verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
      console.log(code_verifier,"-----------------", code_challenge)
    return { code_verifier, code_challenge };
  }

  buildAuthUrl(code_challenge: string) {
    const url = new URL('https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', 'http://localhost:3000');
    url.searchParams.set('scope', 'openid fhirUser patient/*.read patient/DocumentReference.read patient/Observation.read');
    url.searchParams.set('code_challenge', code_challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  async getAccessToken(auth_code: string, code_verifier: string) {
    const data = qs.stringify({
      grant_type: 'authorization_code',
      code: auth_code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      code_verifier,
    });

    const resp = await axios.post('https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token', data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return resp.data;
  }

  async getPatient(access_token: string, patientId: string) {
    const resp = await axios.get(`${this.fhirBaseUrl}/Patient/${patientId}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    return resp.data;
  }

  async getDocumentReferences(patientId: string, accessToken: string) {

    const url = `${this.fhirBaseUrl}/DocumentReference?patient=${patientId}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
    });

    return response.data;
  }

  async getObservations(patientId: string, accessToken: string) {
    const url = `${this.fhirBaseUrl}/Observation?patient=${patientId}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
      },
    });
    return response.data;
  }

}
