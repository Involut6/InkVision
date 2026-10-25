import { describe, expect, it } from 'vitest';

import { ResourceCard } from '@/components/content/resource-card';
import type { ProductSummaryDto } from '@inkvision/shared-types';

import { render, screen } from './test-utils';

const base: ProductSummaryDto = {
  id: 'p1',
  slug: 'personal-branding-blueprint',
  title: 'Personal Branding Blueprint',
  subtitle: 'A structured approach',
  summary: 'A practical workbook for corporate professionals.',
  status: 'COMING_SOON',
  price: null,
  coverImage: null,
  fileFormat: 'PDF',
  purchasable: false,
  featured: true,
};

/**
 * A price shown beside a product that cannot be bought implies a transaction
 * the server will refuse. These tests pin that behaviour to the server's
 * `purchasable` flag rather than to the presence of a price.
 */
describe('ResourceCard', () => {
  it('shows "in preparation" and no price for an unavailable product', () => {
    render(<ResourceCard product={base} />);

    expect(screen.getByText(/in preparation/i)).toBeInTheDocument();
    expect(screen.queryByText(/£|₦|\$/)).not.toBeInTheDocument();
  });

  it('withholds the price even when one is set, if the server says it is not purchasable', () => {
    render(
      <ResourceCard
        product={{ ...base, price: { amountMinor: 950_000, currency: 'GBP' }, purchasable: false }}
      />,
    );

    expect(screen.queryByText('£9,500.00')).not.toBeInTheDocument();
  });

  it('shows the price once the server reports the product as purchasable', () => {
    render(
      <ResourceCard
        product={{
          ...base,
          status: 'ACTIVE',
          price: { amountMinor: 950_000, currency: 'GBP' },
          purchasable: true,
        }}
      />,
    );

    expect(screen.getByText('£9,500.00')).toBeInTheDocument();
    expect(screen.getByText(/available/i)).toBeInTheDocument();
  });

  it('links to the product page', () => {
    render(<ResourceCard product={base} />);
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/resources/personal-branding-blueprint',
    );
  });
});
