import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from 'dotenv';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client();
let TEAM_DOMAIN: string | undefined;
let IS_PRODUCTION: boolean;

async function verifyGoogleOidc(token: string, audience: string) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: audience,
    });
    const payload = ticket.getPayload();
    // 発行者が Google であることを確認
    const isGoogleIss = payload?.iss === 'https://accounts.google.com' || payload?.iss === 'accounts.google.com';
    
    if (!isGoogleIss) {
      console.error('[Auth] Google OIDC Verification Failed: Invalid Issuer', payload?.iss);
    }
    
    return isGoogleIss;
  } catch (e: any) {
    console.error('[Auth] Google OIDC Verification Failed:', e.message);
    return false;
  }
}

function getKey(header: any, callback: any) {
  if (!TEAM_DOMAIN) {
    callback(new Error('TEAM_DOMAIN not set'), null);
    return;
  }
  
  const jwksUri = `${TEAM_DOMAIN}/cdn-cgi/access/certs`;
  const client = jwksClient({ jwksUri });
  
  client.getSigningKey(header.kid, function(err, key) {
    if (err) {
      callback(err, null);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export default defineEventHandler(async (event) => {
  // Ensure env vars are loaded
  config();
  
  TEAM_DOMAIN = process.env.CLOUDFLARE_TEAM_DOMAIN;
  IS_PRODUCTION = process.env.APP_ENV === 'production';

  if (!IS_PRODUCTION) return;

  // 1. Google OIDC トークンの確認 (Cloud Scheduler 等からのリクエスト)
  const authHeader = getHeader(event, 'Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const idToken = authHeader.split(' ')[1];
    // .env から期待されるオーディエンス (Cloud Run の URL) を取得
    const expectedAudience = process.env.GCP_OIDC_AUDIENCE;
    
    if (!expectedAudience) {
      console.error('[Auth] GCP_OIDC_AUDIENCE is not set in environment variables.');
      throw createError({ statusCode: 500, message: 'Server configuration error' });
    }

    const isValid = await verifyGoogleOidc(idToken, expectedAudience);
    if (isValid) {
      return;
    } else {
      console.error('[Auth] Invalid Google OIDC Token.');
      throw createError({ statusCode: 403, message: 'Invalid OIDC Token' });
    }
  }

  // 2. Cloudflare Access トークンの取得 (一般ユーザーからのリクエスト)
  let token = getHeader(event, 'Cf-Access-Jwt-Assertion');
  if (!token) {
    token = getCookie(event, 'CF_Authorization');
  }

  if (!token) {
    if (event.path.startsWith('/api/') || event.path === '/' || event.path === '/dashboard') {
      console.error('[Auth] Missing token for path:', event.path);
      throw createError({
        statusCode: 403,
        message: 'Missing Cloudflare Access Token. Please access via the protected domain.'
      });
    }
    return;
  }

  if (!TEAM_DOMAIN) {
    console.error('[Auth] CLOUDFLARE_TEAM_DOMAIN is not set.');
    throw createError({ statusCode: 500, message: 'Server configuration error' });
  }

  try {
    await new Promise((resolve, reject) => {
      jwt.verify(token!, getKey, {
        issuer: TEAM_DOMAIN
      }, (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          event.context.cloudflareAuth = decoded;
          resolve(decoded);
        }
      });
    });
  } catch (err: any) {
    console.error('[Auth] JWT Verification Failed:', err.message);
    throw createError({
      statusCode: 403,
      message: `Invalid Cloudflare Access Token: ${err.message}`
    });
  }
});
