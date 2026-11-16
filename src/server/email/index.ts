import { join } from 'node:path';
import { config } from '../env.ts';
import { consoleProvider } from './console.ts';
import { resendProvider } from './resend.ts';
import type { EmailProvider } from './types.ts';

export type { EmailAttachment, EmailMessage, EmailProvider, EmailResult } from './types.ts';

/** Returns the configured provider, or undefined when alerts cannot be delivered. */
export function getEmailProvider(): EmailProvider | undefined {
  const c = config();
  switch (c.email.provider) {
    case 'resend':
      return resendProvider({ apiKey: c.email.resendApiKey, apiBase: c.email.resendApiBase });
    case 'console':
      return consoleProvider({ outboxDir: c.isProd ? undefined : join(c.dataDir, 'outbox') });
    default:
      return undefined;
  }
}
