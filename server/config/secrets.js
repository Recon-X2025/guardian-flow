import logger from '../utils/logger.js';

const provider = process.env.SECRETS_PROVIDER || 'env';

export async function loadSecrets() {
  logger.info('Loading secrets', { provider });

  switch (provider) {
    case 'aws':
      return await loadAwsSecrets();
    case 'gcp':
      return await loadGcpSecrets();
    default:
      return loadEnvSecrets();
  }
}

async function loadAwsSecrets() {
  const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
  const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
  const secretName = process.env.AWS_SECRET_NAME || 'guardian-flow/production';
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
  const secrets = JSON.parse(response.SecretString);
  Object.entries(secrets).forEach(([key, value]) => { process.env[key] = value; });
  logger.info('AWS secrets loaded');
  return secrets;
}

async function loadGcpSecrets() {
  const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
  const client = new SecretManagerServiceClient();
  const projectId = process.env.GCP_PROJECT_ID;
  const secretNames = ['MONGODB_URI', 'JWT_SECRET', 'SMTP_PASSWORD'];

  for (const name of secretNames) {
    try {
      const [version] = await client.accessSecretVersion({
        name: `projects/${projectId}/secrets/${name}/versions/latest`,
      });
      process.env[name] = version.payload.data.toString();
    } catch (err) {
      logger.warn(`GCP secret ${name} not found`, { error: err.message });
    }
  }
  logger.info('GCP secrets loaded');
  return {};
}

function loadEnvSecrets() {
  const required = ['JWT_SECRET'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required secrets: ${missing.join(', ')}`);
  }
  logger.info('Environment secrets validated');
  return {};
}

export function validateSecrets() {
  const required = ['JWT_SECRET'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing secrets: ${missing.join(', ')}`);
  }
}
