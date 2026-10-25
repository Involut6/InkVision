import { describe, expect, it } from 'vitest';

import { CaseStudyCard } from '@/components/content/case-study-card';
import type { CaseStudySummaryDto } from '@inkvision/shared-types';

import { render, screen } from './test-utils';

const base: CaseStudySummaryDto = {
  id: 'cs1',
  slug: 'a-case-study',
  title: 'A case study',
  summary: 'A summary of the work.',
  kind: 'SAMPLE',
  category: null,
  clientName: null,
  industry: 'Professional services',
  coverImage: null,
  publishedAt: '2024-05-01T00:00:00.000Z',
  featured: false,
};

/**
 * Mistaking an illustrative sample for commissioned client work is the single
 * most damaging misreading the portfolio can invite, so the label is asserted
 * directly.
 */
describe('CaseStudyCard', () => {
  it('labels an illustrative sample as such', () => {
    render(<CaseStudyCard caseStudy={base} />);
    expect(screen.getByText(/illustrative sample/i)).toBeInTheDocument();
  });

  it('labels a strategic concept as such', () => {
    render(<CaseStudyCard caseStudy={{ ...base, kind: 'CONCEPT' }} />);
    expect(screen.getByText(/strategic concept/i)).toBeInTheDocument();
  });

  it('labels commissioned client work distinctly', () => {
    render(
      <CaseStudyCard caseStudy={{ ...base, kind: 'COMMISSIONED', clientName: 'Meridian Group' }} />,
    );
    expect(screen.getByText(/commissioned client work/i)).toBeInTheDocument();
    expect(screen.getByText('Meridian Group')).toBeInTheDocument();
  });

  it('falls back to the industry when no client name is disclosed', () => {
    render(<CaseStudyCard caseStudy={base} />);
    expect(screen.getByText('Professional services')).toBeInTheDocument();
  });
});
