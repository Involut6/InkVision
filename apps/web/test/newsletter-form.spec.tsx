import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NewsletterForm } from '@/components/site/newsletter-form';
import { browserApi } from '@/lib/api.browser';
import { ApiError } from '@/lib/api-error';

import { renderWithProviders, screen, userEvent, waitFor } from './test-utils';

vi.mock('@/lib/api.browser', () => ({
  browserApi: { post: vi.fn(), get: vi.fn(), patch: vi.fn(), request: vi.fn() },
}));

const post = vi.mocked(browserApi.post);

describe('NewsletterForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires both an address and explicit consent', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewsletterForm />);

    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/enter your email address/i);
    });
    expect(post).not.toHaveBeenCalled();
  });

  it('will not subscribe without the consent box ticked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewsletterForm />);

    await user.type(screen.getByLabelText(/email address/i), 'reader@example.com');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/confirm you would like to receive/i);
    });
    expect(post).not.toHaveBeenCalled();
  });

  it('sends the address, consent and source on a valid submission', async () => {
    post.mockResolvedValue({
      status: 'SUBSCRIBED',
      message: 'You are on the list. Thank you.',
      alreadySubscribed: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<NewsletterForm source="footer" />);

    await user.type(screen.getByLabelText(/email address/i), 'reader@example.com');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/newsletter/subscribe', {
        email: 'reader@example.com',
        consent: true,
        source: 'footer',
      });
    });
  });

  it('announces success in a live region', async () => {
    post.mockResolvedValue({
      status: 'SUBSCRIBED',
      message: 'You are on the list. Thank you.',
      alreadySubscribed: false,
    });

    const user = userEvent.setup();
    renderWithProviders(<NewsletterForm />);

    await user.type(screen.getByLabelText(/email address/i), 'reader@example.com');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/you are on the list/i);
  });

  it('gives an already-subscribed address the same response as a new one', async () => {
    post.mockResolvedValue({
      status: 'SUBSCRIBED',
      message: 'You are on the list. Thank you.',
      alreadySubscribed: true,
    });

    const user = userEvent.setup();
    renderWithProviders(<NewsletterForm />);

    await user.type(screen.getByLabelText(/email address/i), 'reader@example.com');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    // Identical wording, so the form cannot be used to check who is on the list.
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/you are on the list/i);
  });

  it('surfaces a server failure without internal detail', async () => {
    post.mockRejectedValue(new ApiError(500, { code: 'INTERNAL_ERROR' }, 'db exploded'));

    const user = userEvent.setup();
    renderWithProviders(<NewsletterForm />);

    await user.type(screen.getByLabelText(/email address/i), 'reader@example.com');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong on our side/i);
    });
    expect(screen.getByRole('alert')).not.toHaveTextContent(/exploded/i);
  });
});
