/** The site's primary navigation, used by the header, footer and sitemap. */
export interface NavItem {
  readonly label: string;
  readonly href: string;
  readonly description?: string;
  readonly children?: readonly NavItem[];
}

export const PRIMARY_NAV: readonly NavItem[] = [
  {
    label: 'Services',
    href: '/services',
    description: 'How we can help',
    children: [
      {
        label: 'Executive Visibility',
        href: '/services/executive-visibility',
        description: 'Be known for the right thing, by the people who matter.',
      },
      {
        label: 'Thought Leadership & Ghostwriting',
        href: '/services/thought-leadership-ghostwriting',
        description: 'Your ideas, properly argued, in your own voice.',
      },
      {
        label: 'Strategic Content & Communications',
        href: '/services/strategic-content-communications',
        description: 'Content with a reason to exist.',
      },
      {
        label: 'Executive Communications',
        href: '/services/executive-communications',
        description: 'The words that carry weight.',
      },
    ],
  },
  { label: 'Our Approach', href: '/approach', description: 'Strategy before content' },
  { label: 'Selected Work', href: '/work', description: 'Case studies and samples' },
  { label: 'Insights', href: '/insights', description: 'Writing on visibility and communication' },
  { label: 'Resources', href: '/resources', description: 'Practical tools and guides' },
  { label: 'About', href: '/about', description: 'Who we are and how we work' },
] as const;

export const FOOTER_NAV: readonly { title: string; items: readonly NavItem[] }[] = [
  {
    title: 'Services',
    items: [
      { label: 'Executive Visibility', href: '/services/executive-visibility' },
      {
        label: 'Thought Leadership & Ghostwriting',
        href: '/services/thought-leadership-ghostwriting',
      },
      {
        label: 'Strategic Content & Communications',
        href: '/services/strategic-content-communications',
      },
      { label: 'Executive Communications', href: '/services/executive-communications' },
    ],
  },
  {
    title: 'Studio',
    items: [
      { label: 'Our Approach', href: '/approach' },
      { label: 'Selected Work', href: '/work' },
      { label: 'About', href: '/about' },
      { label: 'Frequently Asked Questions', href: '/faq' },
    ],
  },
  {
    title: 'Reading',
    items: [
      { label: 'Insights', href: '/insights' },
      { label: 'Resources', href: '/resources' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { label: 'Privacy Notice', href: '/privacy' },
      { label: 'Terms of Use', href: '/terms' },
      { label: 'Refund Policy', href: '/refund-policy' },
    ],
  },
] as const;

/** True when `href` is the current page or one of its ancestors. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
