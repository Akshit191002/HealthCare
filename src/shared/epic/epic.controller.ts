import { Body, Controller, Get, Post, Query, Headers } from '@nestjs/common';
import { EpicService } from './epic.service';

@Controller('epic')
export class EpicController {
    constructor(private epicService: EpicService) { }

    @Get('auth-url')
    getAuthUrl() {
        const { code_verifier, code_challenge } = this.epicService.generatePkce();
        const url = this.epicService.buildAuthUrl(code_challenge);
        return { url, code_verifier };
    }

    @Get('token')
    async getToken(
        @Query('code') auth_code: string,
        @Query('verifier') code_verifier: string,
    ) {
        return await this.epicService.getAccessToken(auth_code, code_verifier);
    }

    @Get('patient')
    async getPatient(@Query('id') patientId: string,
    @Headers('authorization') authorization: string) {
        if (!authorization?.startsWith('Bearer ')) {
            return { error: 'Missing or invalid Authorization header' };
        }
        const accessToken = authorization.replace('Bearer ', '');
        return await this.epicService.getPatient(accessToken, patientId);
    }

    @Get('document')
    async getDoc(
        @Query('id') patientId: string,
        @Headers('authorization') authorization: string) {
        if (!authorization?.startsWith('Bearer ')) {
            return { error: 'Missing or invalid Authorization header' };
        }
        const accessToken = authorization.replace('Bearer ', '');
        return this.epicService.getDocumentReferences(patientId, accessToken);
    }

      @Get('observations')
    async getObservations(
        @Query('patientId') patientId: string,
        @Headers('authorization') authHeader: string,
    ) {
        const accessToken = authHeader?.replace('Bearer ', '');
        return this.epicService.getObservations(patientId, accessToken);
    }
}
