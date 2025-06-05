import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
  PolicyDocument,
  Statement
} from 'aws-lambda';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

function generatePolicyDocument(effect: 'Allow' | 'Deny', methodArn: string): PolicyDocument {
  const statement: Statement = {
    Action: 'execute-api:Invoke',
    Effect: effect,
    Resource: methodArn,
  };

  return {
    Version: '2012-10-17',
    Statement: [statement],
  };
}

function generateAuthResponse(
  principalId: string,
  effect: 'Allow' | 'Deny',
  methodArn: string,
  context: Record<string, any> = {}
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: generatePolicyDocument(effect, methodArn),
    context,
  };
}

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  console.log('Received token:', event.authorizationToken);
  const token = event.authorizationToken?.split('Bearer ')[1];
  if (!token) throw new Error('Unauthorized');

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    console.log('Decoded token:', decoded);
    return generateAuthResponse(decoded.sub || 'user', 'Allow', event.methodArn, {
      user: JSON.stringify(decoded),
    });
  } catch (err) {
    console.error('JWT verification failed:', err);
    throw new Error('Unauthorized');
  }
};
