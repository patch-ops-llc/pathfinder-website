import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { EmailMessage, EmailProvider, EmailResult } from './types.ts';

interface ConsoleOptions {
  /** Directory for the local outbox. Omit to log a one-line notice only. */
  outboxDir?: string;
}

/**
 * Development fallback. Nothing leaves the machine. Outside production the
 * full message is written to a local outbox folder so it can be inspected;
 * in production only a content-free notice is logged.
 */
export function consoleProvider({ outboxDir }: ConsoleOptions): EmailProvider {
  return {
    name: 'console',
    async send(message: EmailMessage): Promise<EmailResult> {
      const { submissionId, formId } = message.meta;
      if (!outboxDir) {
        console.warn(`[email:console] form=${formId} id=${submissionId} alert email not delivered (EMAIL_PROVIDER=console)`);
        return { ok: true, id: `console-${submissionId}` };
      }
      try {
        const dir = join(outboxDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${formId}-${submissionId}`);
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, 'email.html'), message.html);
        await writeFile(join(dir, 'email.txt'), message.text);
        await writeFile(
          join(dir, 'meta.json'),
          JSON.stringify(
            {
              from: message.from,
              to: message.to,
              cc: message.cc ?? [],
              replyTo: message.replyTo ?? null,
              subject: message.subject,
              attachments: (message.attachments ?? []).map((a) => ({ filename: a.filename, contentType: a.contentType, bytes: a.content.length })),
            },
            null,
            2,
          ),
        );
        for (const a of message.attachments ?? []) await writeFile(join(dir, a.filename), a.content);
        console.info(`[email:console] form=${formId} id=${submissionId} written to ${dir}`);
        return { ok: true, id: `console-${submissionId}` };
      } catch {
        return { ok: false, error: 'console outbox write failed' };
      }
    },
  };
}
