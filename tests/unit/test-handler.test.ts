import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { lambdaHandler } from '../../url-shortner/app';
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

// mock DynamoDB client
const ddbMock = mockClient(DynamoDBClient);

describe('lambdaHandler URL shortener tests', () => {
    beforeEach(() => {
        ddbMock.reset();
    });

    it('returns 400 when POST /get-url-shortner with no URL', async () => {
        const event = {
            httpMethod: 'POST',
            path: '/get-url-shortner',
            body: JSON.stringify({}),
            requestContext: { domainName: 'test.domain', stage: 'dev' },
        } as any;

        const result = await lambdaHandler(event);
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).message).toBe('Missing URL');
    });

    it('successfully shortens URL on POST /get-url-shortner', async () => {
        ddbMock.on(PutItemCommand).resolves({});

        const event = {
            httpMethod: 'POST',
            path: '/get-url-shortner',
            body: JSON.stringify({ url: 'https://example.com' }),
            requestContext: { domainName: 'test.domain', stage: 'dev' },
        } as any;

        const result = await lambdaHandler(event);
        expect(result.statusCode).toBe(200);

        const body = JSON.parse(result.body);
        expect(body.shortUrl).toMatch(/^https:\/\/test\.domain\/dev\/short\/[a-f0-9]{8}$/);

        // Correct assertion here:
        expect(ddbMock.commandCalls(PutItemCommand)).toHaveLength(1);
    });

    it('returns 400 if GET /short/:id missing id param', async () => {
        const event = {
            httpMethod: 'GET',
            path: '/short/',
            pathParameters: {},
        } as any;

        const result = await lambdaHandler(event);
        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body).message).toBe('Missing ID');
    });

    it('redirects to original URL if GET /short/:id found', async () => {
        ddbMock.on(GetItemCommand).resolves({
            Item: { url: { S: 'https://example.com' } },
        });

        const event = {
            httpMethod: 'GET',
            path: '/short/abc123',
            pathParameters: { id: 'abc123' },
        } as any;

        const result = await lambdaHandler(event);
        expect(result.statusCode).toBe(301);
        expect(result.headers?.Location).toBe('https://example.com');
    });

    it('returns 404 if GET /short/:id not found', async () => {
        ddbMock.on(GetItemCommand).resolves({});

        const event = {
            httpMethod: 'GET',
            path: '/short/abc123',
            pathParameters: { id: 'abc123' },
        } as any;

        const result = await lambdaHandler(event);
        expect(result.statusCode).toBe(404);
        expect(JSON.parse(result.body).message).toBe('URL not found');
    });

    it('returns 404 for unknown route', async () => {
        const event = {
            httpMethod: 'GET',
            path: '/unknown',
        } as any;

        const result = await lambdaHandler(event);
        expect(result.statusCode).toBe(404);
        expect(JSON.parse(result.body).message).toBe('Route not found');
    });

    it('returns 500 on internal error', async () => {
        ddbMock.on(PutItemCommand).rejects(new Error('DB error'));

        const event = {
            httpMethod: 'POST',
            path: '/get-url-shortner',
            body: JSON.stringify({ url: 'https://example.com' }),
            requestContext: { domainName: 'test.domain', stage: 'dev' },
        } as any;

        const result = await lambdaHandler(event);
        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body).message).toBe('Internal server error');
    });
});
