import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class SpikeService {
    private readonly baseUrl = 'https://api.spikeapi.com/v3';
    private readonly client: AxiosInstance;

    constructor() {
        this.client = axios.create({ baseURL: this.baseUrl });
    }

    generateHmac(application_user_id: string, secretKey: string): string {
        return crypto
            .createHmac('sha256', secretKey)
            .update(application_user_id)
            .digest('hex');
    }

    async getProviderIntegrationUrl(providerSlug: string, redirectUri?: string, state?: string, providerUserId?: string) {
        try {
            const accessToken = process.env.SPIKE_ACCESS_TOKEN;
            const params: any = { redirect_uri: redirectUri, state, provider_user_id: providerUserId };
            const res = await this.client.get(`/providers/${providerSlug}/integration/init_url`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null)),
            });
            return res.data;
        } catch (err: any) {
            throw new HttpException('Failed to obtain integration URL', HttpStatus.BAD_REQUEST);
        }
    }

    // async providerIntegration(provider_slug: string, application_user_id: string) {
    //     try {
    //         const res = await this.client.post('/integrations/create', { provider_slug, application_user_id });
    //         return res.data;
    //     } catch (err: any) {
    //         throw new HttpException('Provider Integration Failed', HttpStatus.BAD_REQUEST);
    //     }
    // }

    async authenticateUser(application_id: string, application_user_id: string) {
        try {
            const secretKey = process.env.SPIKE_SECRET_KEY;
            if (!secretKey) {
                throw new HttpException('SPIKE_SECRET_KEY is not found', HttpStatus.INTERNAL_SERVER_ERROR);
            }
            const hmac_signature = this.generateHmac(application_user_id, secretKey);
            const res = await this.client.post('/auth/hmac', { application_id, application_user_id, hmac_signature });
            return res.data;
        } catch (err: any) {
            throw new HttpException('Authentication Failed', HttpStatus.BAD_REQUEST);
        }
    }

    async getUserInfo(access_token: string, application_user_id: string) {
        try {
            const res = await this.client.get('/userinfo', {
                headers: { Authorization: `Bearer ${access_token}` },
                params: { application_user_id },
            });
            return res.data;
        } catch (err: any) {
            throw new HttpException('Failed to fetch user info', HttpStatus.BAD_REQUEST);
        }
    }

    async getUserProperties(access_token: string) {
        try {
            const res = await this.client.get('/userproperties', {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            return res.data;
        } catch (err: any) {
            throw new HttpException('Failed to fetch user properties', HttpStatus.BAD_REQUEST);
        }
    }

    async fetchProviderRecords(access_token: string, provider_slug: string) {
        try {
            const res = await this.client.get('/queries/provider_records', {
                headers: { Authorization: `Bearer ${access_token}` },
                params: { provider_slug },
            });
            return res.data;
        } catch (err: any) {
            throw new HttpException('Failed to fetch provider records', HttpStatus.BAD_REQUEST);
        }
    }
}
