import { BadRequestException, Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SquareService } from './square.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AddFamilyMemberDto1, RemoveMemberDto } from './add.dto';

@ApiTags('Square')
@Controller('square')
export class SquareController {
    constructor(private readonly squareService: SquareService) { }

    @Post('customer')
    @ApiOperation({ summary: 'Create Square customer' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                email: { type: 'string', example: 'test@gmail.com' },
                givenName: { type: 'string', example: 'John' },
                familyName: { type: 'string', example: 'Doe' },
                birthday: { type: 'string', example: '1990-05-15' },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'Customer created successfully' })
    async createCustomer(@Body() body: { email: string; givenName: string; familyName: string; birthday?: string }) {
        return await this.squareService.createCustomer(body);
    }


    @Post('card/:customerId')
    @ApiOperation({ summary: 'Create card for a customer' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                sourceId: { type: 'string', example: 'cnon:card-nonce-ok' },
                cardholderName: { type: 'string', example: 'John Doe' },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'Card created successfully' })
    async createCard(
        @Param('customerId') customerId: string,
        @Body() body: { sourceId: string; cardholderName: string },
    ) {
        return await this.squareService.createCard(customerId, body.sourceId, body.cardholderName);
    }


    @Post('subscription')
    @ApiOperation({ summary: 'Create subscription for a customer' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                customerId: { type: 'string', example: 'CUSTOMER_ID' },
                locationId: { type: 'string', example: 'LOCATION_ID' },
                planVariationId: { type: 'string', example: 'PLAN_VARIATION_ID' },
                cardId: { type: 'string', example: 'CARD_ID' },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'Subscription created successfully' })
    async createSubscription(
        @Body() body: { customerId: string; planVariationId: string; cardId: string ;locationId?: string;},
    ) {
        const locations = await this.squareService.listLocations();
        const locationId = locations[0]?.id;

        if (!locationId) {
            throw new BadRequestException('No valid locationId available for subscription.');
        }
        return await this.squareService.createSubscription(
            body.customerId,
            body.planVariationId,
            body.cardId,
            locationId,
        );
    }


    @Post('subscription/update')
    @ApiOperation({ summary: 'Update subscription amount' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                subscriptionId: { type: 'string', example: 'SUBSCRIPTION_ID' },
                subscriptionVersion: { type: 'number', example: 1 },
                newAmount: { type: 'number', example: 5000 },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Subscription updated successfully' })
    async updateSubscription(
        @Body() body: { subscriptionId: string; subscriptionVersion: number; newAmount: number },
    ) {
        return await this.squareService.updateSubscription(body.subscriptionId, body.subscriptionVersion, body.newAmount);
    }


    @Post('charge')
    @ApiOperation({ summary: 'Charge a customer' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                customerId: { type: 'string', example: 'CUSTOMER_ID' },
                sourceId: { type: 'string', example: 'CARD_ID' },
                amount: { type: 'number', example: 1000 },
                note: { type: 'string', example: 'Testing charge' },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'Payment processed successfully' })
    async chargeProrated(@Body() body: { customerId: string; sourceId: string; amount: number; note?: string }) {
        return await this.squareService.chargeProrated(
            body.customerId,
            body.sourceId,
            body.amount,
            body.note || 'Manual charge test',
        );
    }




    @Get('customers')
    @ApiOperation({ summary: 'List all Sandbox customers' })
    @ApiResponse({ status: 200, description: 'List of customers' })
    async listCustomers() {
        return await this.squareService.listCustomers();
    }

    @Get('subscriptions')
    @ApiOperation({ summary: 'Get all subscriptions' })
    @ApiResponse({ status: 200, description: 'List of subscriptions' })
    async getAllSubscriptions() {
        return this.squareService.listSubscriptions();
    }

    @Get('payments')
    @ApiOperation({ summary: 'Get all payments' })
    @ApiResponse({ status: 200, description: 'List of payments' })
    async getAllPayments() {
        return this.squareService.listPayments();
    }

    @Post('add-family-member')
    @ApiOperation({ summary: 'Add a new family member to an existing subscription' })
    @ApiResponse({ status: 201, description: 'Family member added successfully' })
    @ApiResponse({ status: 400, description: 'Missing or invalid data' })
    async addFamilyMember(@Body() body: AddFamilyMemberDto1) {
        if (!body.mainCustomerId || !body.mainCardId || !body.subscriptionId) {
            throw new BadRequestException('Missing main subscription or customer/card details');
        }

        const result = await this.squareService.addFamilyMember(
            body.mainCustomerId,
            body.mainCardId,
            body.subscriptionId,
            new Date(body.joinDate),
            body.newMemberAmount
        );

        return result;
    }

    @Post('remove-family-member')
    @ApiOperation({ summary: 'Remove a family member from a subscription' })
    @ApiResponse({ status: 200, description: 'Family member removed successfully' })
    async removeFamilyMember(@Body() dto: RemoveMemberDto) {
        if (!dto.mainCustomerId || !dto.subscriptionId) {
            throw new BadRequestException('Missing required fields');
        }

        return this.squareService.removeFamilyMember(
            dto.mainCustomerId,
            dto.subscriptionId,
            dto.removedMemberAmount
        );
    }

}
