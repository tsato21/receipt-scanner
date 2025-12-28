import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

// Ensure env vars are loaded
config();

const projectId = process.env.PROJECT_ID || process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: projectId,
  });
}

export const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

// Collection Names Configuration
const ENV_PREFIX = process.env.APP_ENV === 'staging' ? 'staging_' : '';

export const COLLECTION_RECEIPTS = `${ENV_PREFIX}receipts`;
export const COLLECTION_STORES = `${ENV_PREFIX}stores`;
export const COLLECTION_CATEGORIES = `${ENV_PREFIX}categories`;
export const COLLECTION_REMINDERS = `${ENV_PREFIX}reminders`;
export const COLLECTION_NOTIFICATION_LOGS = `${ENV_PREFIX}notification_logs`;
export const COLLECTION_STATEMENTS = `${ENV_PREFIX}statements`;
export const COLLECTION_STATEMENT_FORMATS = `${ENV_PREFIX}statement_formats`;

export const toJsDate = (val: any): Date => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val.toDate === 'function') return val.toDate();
  if (typeof val === 'string' || typeof val === 'number') return new Date(val);
  return new Date();
};
