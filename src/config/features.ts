// Content decisions that change what the site collects. These are code-level
// switches rather than environment variables so the browser form and the
// server validation can never disagree.

export const features = {
  /**
   * The previous employment application asked for a Social Security number.
   * It is off by default: the number would travel in the alert email, and an
   * application does not need it before an offer is made. Set to true to
   * restore the field (it is then required, masked, sent in the alert email
   * only and never to HubSpot, the webhook or logs).
   */
  collectSsnOnCareersForm: false,
} as const;
