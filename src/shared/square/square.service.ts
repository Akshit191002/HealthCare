import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SquareClient, SquareEnvironment } from 'square';
import * as crypto from 'crypto';

export interface ProratedCharge {
    proratedAmount: number;
    nextBillingAmount: number;
}

export function calculateProrated(
    currentPlanAmount: number,
    newMemberAmount: number,
    billingStartDate: Date,
    joinDate: Date,
    billingPeriodDays: number = 365
): ProratedCharge {
    const elapsedDays = Math.floor((joinDate.getTime() - billingStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = billingPeriodDays - elapsedDays;

    const proratedAmount = Math.round(newMemberAmount * (remainingDays / billingPeriodDays) * 100) / 100;

    const nextBillingAmount = currentPlanAmount + newMemberAmount;

    return { proratedAmount, nextBillingAmount };
}


@Injectable()
export class SquareService {
    private readonly logger = new Logger(SquareService.name);
    private client: SquareClient;

    constructor() {
        this.client = new SquareClient({
            environment: SquareEnvironment.Sandbox,
            token: process.env.SQUARE_ACCESS_TOKEN!,
        });
    }

    private serializeBigInt(obj: any): any {
        if (typeof obj === 'bigint') return obj.toString();
        if (Array.isArray(obj)) return obj.map(this.serializeBigInt.bind(this));
        if (obj !== null && typeof obj === 'object') {
            return Object.fromEntries(
                Object.entries(obj).map(([k, v]) => [k, this.serializeBigInt(v)])
            );
        }
        return obj;
    }

    verifyWebhookSignature(signature: string, body: string): boolean {
        const webhookSecret = process.env.SQUARE_SIGNATURE_KEY;
        if (!webhookSecret) {
            this.logger.error('SQUARE_WEBHOOK_SECRET is not set!');
            throw new Error('SQUARE_WEBHOOK_SECRET is missing in environment variables');
        }

        const hmac = crypto.createHmac('sha1', webhookSecret);
        hmac.update(body);
        const expectedSignature = hmac.digest('base64');
        return signature === expectedSignature;
    }


    async listLocations() {
        const response = await this.client.locations.list();
        return response.locations?.map(l => ({
            id: l.id,
            name: l.name,
            address: l.address,
            status: l.status,
        })) || [];
    }

    async createCustomer(data: {
        email: string;
        givenName: string;
        familyName: string;
        birthday?: string;
        referenceId?: string;
    }) {
        const response = await this.client.customers.create({
            idempotencyKey: crypto.randomUUID(),
            emailAddress: data.email,
            givenName: data.givenName,
            familyName: data.familyName,
            birthday: data.birthday,
            referenceId: data.referenceId,
        });
        this.logger.log(`Created customer ${response.customer?.id}`);
        return this.serializeBigInt(response.customer);
    }

    async createCard(customerId: string, sourceId: string, cardholderName: string) {
        const response = await this.client.cards.create({
            idempotencyKey: crypto.randomUUID(),
            sourceId,
            card: {
                customerId,
                cardholderName,
            },
        });
        this.logger.log(`Created card ${response.card?.id}`);
        return this.serializeBigInt(response.card);
    }

    async createSubscription(customerId: string, planVariationId: string, cardId: string, locationId?: string,) {
        const locations = await this.listLocations();
        const locationID = locationId ? locationId : locations[0]?.id;

        if (!locationID) {
            throw new BadRequestException('No valid locationId available for subscription.');
        }
        const response = await this.client.subscriptions.create({
            idempotencyKey: crypto.randomUUID(),
            customerId,
            locationId: locationID,
            planVariationId,
            cardId,
            startDate: new Date().toISOString().split('T')[0],
        });
        this.logger.log(`Created subscription ${response.subscription?.id}`);
        return this.serializeBigInt(response.subscription);
    }

    async updateSubscription(subscriptionId: string, subscriptionVersion: number, newAmount: number) {
        const response = await this.client.subscriptions.update({
            subscription: {
                id: subscriptionId,
                version: BigInt(subscriptionVersion),
                priceOverrideMoney: {
                    amount: BigInt(newAmount),
                    currency: 'USD',
                },
            },
            subscriptionId
        });
        this.logger.log(`Updated subscription ${subscriptionId} with price ${newAmount}`);
        return this.serializeBigInt(response.subscription);
    }

    async chargeProrated(customerId: string, sourceId: string, amount: number, note = 'Prorated charge') {
        const response = await this.client.payments.create({
            idempotencyKey: crypto.randomUUID(),
            customerId,
            sourceId,
            amountMoney: {
                amount: BigInt(amount),
                currency: 'USD',
            },
            note,
        });
        this.logger.log(`Charged ${amount} cents from customer ${customerId}`);
        return this.serializeBigInt(response.payment);
    }

    async addFamilyMember(
        mainCustomerId: string,
        mainCardId: string,
        subscriptionId: string,
        joinDate: Date,
        newMemberAmount?: number
    ) {
        if (!mainCustomerId || !mainCardId || !subscriptionId) {
            throw new BadRequestException('Missing main subscription or customer/card details');
        }

        const subscriptionResponse = await this.client.subscriptions.get({ subscriptionId });
        const subscription = subscriptionResponse.subscription;
        if (!subscription) throw new BadRequestException('Subscription not found');

        const subscriptionVersion = subscription.version;
        if (subscriptionVersion === undefined) throw new BadRequestException('Subscription version missing');

        const planVariationId = subscription.planVariationId;
        if (!planVariationId) throw new BadRequestException('Subscription plan variation not found');

        const planVariationResponse = await this.client.catalog.object.get({ objectId: planVariationId });
        const planVariationObject = planVariationResponse.object;
        if (!planVariationObject || !('subscriptionPlanVariationData' in planVariationObject)) {
            throw new BadRequestException('Plan variation data not found in catalog object');
        }
        const planVariation = planVariationObject.subscriptionPlanVariationData;
        if (!planVariation) throw new BadRequestException('Plan variation data is undefined');

        const phase = planVariation.phases?.[0];
        if (!phase || !phase.pricing?.priceMoney || phase.pricing.priceMoney.amount === undefined) {
            throw new BadRequestException('Invalid pricing data in plan variation phase');
        }

        const currentPlanAmount = subscription.priceOverrideMoney?.amount
            ? Number(subscription.priceOverrideMoney.amount) / 100
            : Number(phase.pricing.priceMoney.amount) / 100;

        const memberAmount = newMemberAmount ?? (Number(phase.pricing.priceMoney.amount) / 100);

        const startDate = subscription.startDate;
        if (!startDate) throw new BadRequestException('Subscription startDate missing');
        const billingStartDate = new Date(startDate);

        const cadence = phase.cadence || 'MONTHLY';
        const billingPeriodDays = cadence === 'MONTHLY' ? 31 : 365;

        const { proratedAmount, nextBillingAmount } = calculateProrated(
            currentPlanAmount,
            memberAmount,
            billingStartDate,
            joinDate,
            billingPeriodDays
        );

        this.logger.log(`Prorated amount for new member: $${proratedAmount}`);
        this.logger.log(`Next billing amount after adding member: $${nextBillingAmount}`);

        await this.chargeProrated(
            mainCustomerId,
            mainCardId,
            Math.round(proratedAmount * 100),
            'Prorated charge for new family member'
        );

        await this.updateSubscription(
            subscriptionId,
            Number(subscriptionVersion),
            Math.round(nextBillingAmount * 100)
        );

        return {
            message: 'Family member added successfully',
            immediateCharge: proratedAmount,
            nextBillingAmount
        };
    }

    async removeFamilyMember(
        mainCustomerId: string,
        subscriptionId: string,
        removedMemberAmount?: number
    ) {
        if (!mainCustomerId || !subscriptionId) {
            throw new BadRequestException('Missing subscription or customer details');
        }

        const subscriptionResponse = await this.client.subscriptions.get({ subscriptionId });
        const subscription = subscriptionResponse.subscription;
        if (!subscription) throw new BadRequestException('Subscription not found');

        const planVariationId = subscription.planVariationId;
        if (!planVariationId) throw new BadRequestException('Subscription plan variation not found');

        const planVariationResponse = await this.client.catalog.object.get({ objectId: planVariationId });
        const planVariationObject = planVariationResponse.object;
        if (!planVariationObject || !('subscriptionPlanVariationData' in planVariationObject)) {
            throw new BadRequestException('Plan variation data not found in catalog object');
        }

        const planVariation = planVariationObject.subscriptionPlanVariationData;

        if (!planVariation) {
            throw new BadRequestException('Plan variation data is undefined');
        }

        const phase = planVariation.phases?.[0];
        if (!phase || !phase.pricing?.priceMoney || phase.pricing.priceMoney.amount === undefined) {
            throw new BadRequestException('Invalid pricing data in plan variation phase');
        }

        const currentPlanAmount = subscription.priceOverrideMoney?.amount
            ? Number(subscription.priceOverrideMoney.amount) / 100
            : Number(phase.pricing.priceMoney.amount) / 100;

        const memberAmount = removedMemberAmount !== undefined
            ? removedMemberAmount / 100
            : Number(phase.pricing.priceMoney.amount) / 100;

        const nextBillingAmount = currentPlanAmount - memberAmount;
        if (nextBillingAmount < 0) throw new BadRequestException('Next billing amount cannot be negative');

        await this.updateSubscription(
            subscriptionId,
            Number(subscription.version),
            Math.round(nextBillingAmount * 100)
        );

        return {
            message: 'Family member removed successfully',
            nextBillingAmount
        };
    }


    async listCustomers() {
        const response = await this.client.customers.list();
        const customers = response.data || [];
        return customers.map(c => ({
            id: c.id,
            email: c.emailAddress,
            givenName: c.givenName,
            familyName: c.familyName,
            createdAt: c.createdAt,
        }));
    }

    async listSubscriptions() {
        const response = await this.client.subscriptions.search({ query: {} });
        const subscriptions = response.subscriptions || [];

        const planIds = Array.from(new Set(subscriptions.map(s => s.planVariationId).filter(Boolean)));

        const planMap: Record<string, { amount: number; currency: string } | null> = {};

        for (const planId of planIds) {
            if (!planId) continue;

            const planResponse = await this.client.catalog.object.get({ objectId: planId });
            const planObject = planResponse.object;

            const planVariationData = (planObject?.type === 'SUBSCRIPTION_PLAN_VARIATION')
                ? planObject.subscriptionPlanVariationData
                : undefined;

            const phase = planVariationData?.phases?.[0];
            const priceMoney = phase?.pricing?.priceMoney;

            if (priceMoney?.amount !== undefined && priceMoney?.currency) {
                planMap[planId] = { amount: Number(priceMoney.amount), currency: priceMoney.currency };
            } else {
                planMap[planId] = null;
            }
        }
        const result = subscriptions.map(s => {
            let price: number | null = null;
            let currency = 'USD';

            if (s.priceOverrideMoney?.amount !== undefined) {
                price = Number(s.priceOverrideMoney.amount);
                currency = s.priceOverrideMoney.currency ?? 'USD';
            } else if (s.planVariationId && planMap[s.planVariationId]) {
                price = planMap[s.planVariationId]?.amount ?? null;
                currency = planMap[s.planVariationId]?.currency ?? 'USD';
            }

            return this.serializeBigInt({
                id: s.id,
                customerId: s.customerId,
                planVariationId: s.planVariationId,
                startDate: s.startDate,
                status: s.status,
                version: s.version,
                cardId: s.cardId,
                price,
                currency,
            });
        });

        return result;
    }

    async listPayments() {
        const response = await this.client.payments.list();

        const payments = response.data || [];
        return payments.map((p) => this.serializeBigInt({
            id: p.id,
            amount: p.amountMoney?.amount?.toString(),
            currency: p.amountMoney?.currency,
            status: p.status,
            customerId: p.customerId,
            cardId: p.cardDetails?.card?.id,
            createdAt: p.createdAt,
        }));
    }
}