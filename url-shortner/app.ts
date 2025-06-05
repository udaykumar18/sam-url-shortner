import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME!;

const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
});

const generateShortId = (): string => uuidv4().split('-')[0];

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const method = event.httpMethod;
        const path = event.path;

        // Shorten URL
        if (method === 'POST' && path === '/get-url-shortner') {
            const body = JSON.parse(event.body || '{}');
            const originalUrl = body.url;
            if (!originalUrl) {
                return createResponse(400, { message: 'Missing URL' });
            }

            const id = generateShortId();
            await client.send(
                new PutItemCommand({
                    TableName: TABLE_NAME,
                    Item: {
                        id: { S: id },
                        url: { S: originalUrl },
                    },
                }),
            );

            const shortUrl = `https://${event.requestContext.domainName}/${event.requestContext.stage}/short/${id}`;

            return createResponse(200, { shortUrl });
        }

        // Redirect to original URL
        if (method === 'GET' && path.startsWith('/short/')) {
            const id = event.pathParameters?.id;
            if (!id) {
                return createResponse(400, { message: 'Missing ID' });
            }

            const result = await client.send(
                new GetItemCommand({
                    TableName: TABLE_NAME,
                    Key: { id: { S: id } },
                }),
            );

            const url = result.Item?.url?.S;
            if (!url) {
                return createResponse(404, { message: 'URL not found' });
            }

            return {
                statusCode: 301,
                headers: {
                    Location: url,
                },
                body: '',
            };
        }

        return createResponse(404, { message: 'Route not found' });
    } catch (err) {
        console.error(err);
        return createResponse(500, { message: 'Internal server error' });
    }
};
