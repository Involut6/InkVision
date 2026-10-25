import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnquiryForm } from '@/components/site/enquiry-form';
import { browserApi } from '@/lib/api.browser';
import { ApiError } from '@/lib/api-error';

import { renderWithProviders, screen, userEvent, waitFor } from './test-utils';

vi.mock('@/lib/api.browser', () => ({
  browserApi: { post: vi.fn(), get: vi.fn(), patch: vi.fn(), request: vi.fn() },
}));

const post = vi.mocked(browserApi.post);

/**
 * The enquiry form is the site's primary conversion path, so these tests cover
 * the three things that lose a lead: a valid submission failing to send, a
 * visitor not being told what is wrong, and a confirmation that is invisible
 * to assistive technology.
 */
describe('EnquiryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/full name/i), 'Adaeze Okonkwo');
    await user.type(screen.getByLabelText(/work email/i), 'adaeze@example.com');
    await user.selectOptions(screen.getByLabelText(/service of interest/i), 'EXECUTIVE_VISIBILITY');
    await user.selectOptions(screen.getByLabelText(/desired timeline/i), 'ONE_TO_THREE_MONTHS');
    await user.type(
      screen.getByLabelText(/what are you working towards/i),
      'We would like to discuss positioning work for our managing director.',
    );
    await user.click(screen.getByRole('checkbox'));
  }

  it('labels every control, so each is reachable by name', () => {
    renderWithProviders(<EnquiryForm />);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/organisation or role/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/service of interest/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/desired timeline/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/what are you working towards/i)).toBeInTheDocument();
  });

  it('marks required fields with aria-required', () => {
    renderWithProviders(<EnquiryForm />);

    expect(screen.getByLabelText(/full name/i)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText(/work email/i)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText(/organisation or role/i)).not.toHaveAttribute('aria-required');
  });

  it('refuses to submit an empty form and reports every problem', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm />);

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    await waitFor(() => {
      expect(screen.getByText(/please enter your full name/i)).toBeInTheDocument();
    });

    // An empty field reports "enter your …" rather than the format message —
    // telling someone their blank input is not a valid email helps nobody.
    expect(screen.getByText(/please enter your work email address/i)).toBeInTheDocument();
    expect(screen.getByText(/choose the service/i)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('requires consent before anything is sent', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('checkbox')); // untick it again
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    await waitFor(() => {
      expect(screen.getByText(/happy for us to contact you/i)).toBeInTheDocument();
    });
    expect(post).not.toHaveBeenCalled();
  });

  it('reports a malformed email with the format message', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm />);

    await user.type(screen.getByLabelText(/work email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid work email address/i)).toBeInTheDocument();
    });
  });

  it('rejects a message that is too short to be useful', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm />);

    await user.type(screen.getByLabelText(/full name/i), 'Adaeze Okonkwo');
    await user.type(screen.getByLabelText(/work email/i), 'adaeze@example.com');
    await user.selectOptions(screen.getByLabelText(/service of interest/i), 'NOT_SURE_YET');
    await user.selectOptions(screen.getByLabelText(/desired timeline/i), 'EXPLORING');
    await user.type(screen.getByLabelText(/what are you working towards/i), 'Too short');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 20 characters/i)).toBeInTheDocument();
    });
  });

  it('marks invalid fields with aria-invalid for assistive technology', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm />);

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('submits a valid enquiry with consent normalised to true', async () => {
    post.mockResolvedValue({
      received: true,
      reference: 'ENQ-ABC123',
      message: 'Thank you for reaching out to InkVision Creatives.',
      duplicate: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));

    expect(post).toHaveBeenCalledWith(
      '/enquiries',
      expect.objectContaining({
        fullName: 'Adaeze Okonkwo',
        workEmail: 'adaeze@example.com',
        serviceInterest: 'EXECUTIVE_VISIBILITY',
        timeline: 'ONE_TO_THREE_MONTHS',
        consent: true,
      }),
    );
  });

  it('shows the confirmation in a live region with the reference', async () => {
    post.mockResolvedValue({
      received: true,
      reference: 'ENQ-ABC123',
      message: 'Thank you for reaching out to InkVision Creatives. Your enquiry has been received.',
      duplicate: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/thank you for reaching out/i);
    expect(status).toHaveTextContent('ENQ-ABC123');
    // Focus is moved here, so the confirmation is announced rather than silent.
    expect(status).toHaveAttribute('tabindex', '-1');
  });

  it('attaches server-side field errors to the right inputs', async () => {
    post.mockRejectedValue(
      new ApiError(
        400,
        {
          code: 'VALIDATION_FAILED',
          message: 'The submitted data is invalid.',
          details: { workEmail: ['That address is not accepted.'] },
        },
        'failed',
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    await waitFor(() => {
      expect(screen.getByText(/that address is not accepted/i)).toBeInTheDocument();
    });
  });

  it('reports a rate-limit refusal in plain language', async () => {
    post.mockRejectedValue(new ApiError(429, { code: 'RATE_LIMITED' }, 'rate limited'));

    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/wait a moment and try again/i);
  });

  it('does not expose internal detail when the server errors', async () => {
    post.mockRejectedValue(new ApiError(500, { code: 'INTERNAL_ERROR' }, 'boom'));

    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/something went wrong on our side/i);
    expect(alert).not.toHaveTextContent(/boom/i);
  });

  it('pre-selects the service when arriving from a service page', () => {
    renderWithProviders(<EnquiryForm defaultServiceInterest="EXECUTIVE_COMMUNICATIONS" />);
    expect(screen.getByLabelText(/service of interest/i)).toHaveValue('EXECUTIVE_COMMUNICATIONS');
  });

  it('hides the honeypot from assistive technology as well as from sight', () => {
    const { container } = renderWithProviders(<EnquiryForm />);
    const honeypot = container.querySelector('input[name="website"]');

    expect(honeypot).not.toBeNull();
    expect(honeypot?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(honeypot).toHaveAttribute('tabindex', '-1');
  });
});
