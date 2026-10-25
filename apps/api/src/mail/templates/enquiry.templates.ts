import {
  ENQUIRY_TIMELINE_LABELS,
  SERVICE_INTEREST_LABELS,
  type EnquiryTimeline,
  type ServiceInterest,
} from '@inkvision/shared-types';

import type { EmailMessage } from '../mail.types.js';

export interface EnquiryEmailContext {
  readonly reference: string;
  readonly fullName: string;
  readonly workEmail: string;
  readonly organisationOrRole: string | null;
  readonly serviceInterest: ServiceInterest;
  readonly timeline: EnquiryTimeline;
  readonly budgetRange: string | null;
  readonly referralSource: string | null;
  readonly message: string;
  readonly adminUrl: string;
  readonly siteName: string;
}

/**
 * Notification to the business. Plain text on purpose: it is an internal
 * working email, and plain text is what pastes cleanly into a reply.
 */
export function buildEnquiryNotificationEmail(
  to: string,
  context: EnquiryEmailContext,
): EmailMessage {
  const lines = [
    `New enquiry — ${context.reference}`,
    '',
    `Name:         ${context.fullName}`,
    `Email:        ${context.workEmail}`,
    ...(context.organisationOrRole ? [`Organisation: ${context.organisationOrRole}`] : []),
    `Service:      ${SERVICE_INTEREST_LABELS[context.serviceInterest]}`,
    `Timeline:     ${ENQUIRY_TIMELINE_LABELS[context.timeline]}`,
    ...(context.budgetRange ? [`Budget:       ${context.budgetRange}`] : []),
    ...(context.referralSource ? [`Heard via:    ${context.referralSource}`] : []),
    '',
    'What they wrote:',
    '',
    context.message,
    '',
    '───',
    `Open in the portal: ${context.adminUrl}`,
  ];

  return {
    to,
    subject: `New enquiry (${SERVICE_INTEREST_LABELS[context.serviceInterest]}) — ${context.reference}`,
    text: lines.join('\n'),
    // Replying to the notification replies to the enquirer, which is what
    // whoever picks this up will want to do.
    replyTo: context.workEmail,
  };
}

/**
 * Confirmation to the visitor. Deliberately restrained: it acknowledges receipt
 * and sets expectations without promising a response time the business has not
 * committed to.
 */
export function buildEnquiryConfirmationEmail(context: EnquiryEmailContext): EmailMessage {
  const text = [
    `Dear ${context.fullName.split(' ')[0] ?? context.fullName},`,
    '',
    `Thank you for reaching out to ${context.siteName}. Your enquiry has been received.`,
    'We will review the details and respond using the contact information you provided.',
    '',
    `Your reference is ${context.reference}. Please quote it if you need to follow up.`,
    '',
    'For your records, this is what you sent:',
    '',
    `  Service of interest: ${SERVICE_INTEREST_LABELS[context.serviceInterest]}`,
    `  Timeline:            ${ENQUIRY_TIMELINE_LABELS[context.timeline]}`,
    '',
    context.message
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n'),
    '',
    'Kind regards,',
    context.siteName,
  ].join('\n');

  return {
    to: context.workEmail,
    subject: `We have received your enquiry — ${context.reference}`,
    text,
  };
}

export function buildNewsletterWelcomeEmail(
  email: string,
  siteName: string,
  unsubscribeUrl: string,
): EmailMessage {
  return {
    to: email,
    subject: `You are subscribed to ${siteName} insights`,
    text: [
      'Thank you for subscribing.',
      '',
      `You will receive occasional, considered writing from ${siteName} on positioning,`,
      'thought leadership and communicating expertise. No more often than we have',
      'something worth your time.',
      '',
      `To unsubscribe at any time: ${unsubscribeUrl}`,
    ].join('\n'),
  };
}
