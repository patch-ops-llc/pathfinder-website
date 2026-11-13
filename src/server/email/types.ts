export interface EmailAttachment {
  filename: string;
  contentType: string;
  content: Uint8Array;
}

export interface EmailMessage {
  from: string;
  to: string[];
  cc?: string[];
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
  /** Reference used in logs and the dev outbox. Not sent to the provider. */
  meta: { submissionId: string; formId: string };
}

export interface EmailResult {
  ok: boolean;
  /** Provider message id, when one is returned. */
  id?: string;
  /** Short reason, safe to log. */
  error?: string;
}

/**
 * Email delivery is behind this interface so the provider can be swapped
 * without touching the form pipeline. Add a provider by implementing `send`
 * and registering it in `getEmailProvider`.
 */
export interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<EmailResult>;
}
