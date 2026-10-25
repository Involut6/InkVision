/**
 * Approach stages, article categories, FAQ content, legal templates and the
 * initial resource listing.
 *
 * Content integrity rules observed throughout this file:
 *   * No client names, testimonials, logos, statistics or outcomes are invented.
 *   * Articles are seeded as DRAFTS. Nothing is presented as published writing
 *     that has not actually been written and approved.
 *   * The legal pages are marked `awaitingReview`, so the site renders a visible
 *     notice until the business has had them reviewed.
 *   * The featured product is seeded as COMING_SOON with no price, because its
 *     pricing, file and refund terms have not been supplied.
 */

export interface ApproachStageSeed {
  slug: string;
  position: number;
  title: string;
  summary: string;
  detailHtml: string;
  clientRole: string;
}

export const APPROACH_STAGES: ApproachStageSeed[] = [
  {
    slug: 'understand-the-context',
    position: 1,
    title: 'Understand the context',
    summary:
      'Before anything is written, we need to understand the work, the goals and the audiences that matter.',
    detailHtml: `<p>Every engagement begins with structured conversations. We ask about the work you have actually done, the decisions you have made, the arguments you have formed and the audiences whose understanding of you would change something material.</p>
<p>We also look at what already exists — your current presence, your organisation's communications, the conversation happening in your field — so that what we build connects to reality rather than starting from a blank page.</p>
<p>This stage produces shared understanding. It is also where we tell you if we think the thing you have asked for is not the thing you need.</p>`,
    clientRole:
      'You bring the substance: the experience, the thinking and the honest account of what you are trying to achieve. Nothing downstream works without it.',
  },
  {
    slug: 'find-the-point-of-view',
    position: 2,
    title: 'Find the point of view',
    summary:
      'Strategy before content. A position you can hold, stated clearly enough to exclude things.',
    detailHtml: `<p>A point of view is not a tagline. It is a defensible statement of the territory you occupy, the perspective you bring to it, and what you are prepared to argue that others might not.</p>
<p>We propose a position and test it with you. The test is specificity: a position that would fit anyone in your field describes no one. It has to exclude things to be worth anything.</p>
<p>This is the decision every later decision rests on — what to write, where to appear, what to decline.</p>`,
    clientRole: 'You approve the position. It describes you publicly, so it is not ours to settle.',
  },
  {
    slug: 'build-the-system',
    position: 3,
    title: 'Build the system',
    summary: 'Themes, formats, cadence and ownership — sized to the capacity you actually have.',
    detailHtml: `<p>With a position agreed, we design the system that expresses it: the themes worth owning, the formats that suit your material and your audiences, a cadence that is sustainable, and clear ownership for each part.</p>
<p>We size the plan to real capacity. An ambitious schedule that collapses after six weeks does more damage than a modest one that runs for two years.</p>
<p>Where several people will be writing, this stage also produces the editorial standards that let them sound like one organisation.</p>`,
    clientRole:
      'You tell us what is realistic. We would rather design a smaller programme that survives contact with your calendar.',
  },
  {
    slug: 'create-and-refine',
    position: 4,
    title: 'Create and refine',
    summary: 'Research, writing, your review, revision — until the voice is unmistakably yours.',
    detailHtml: `<p>Production is interview-led. Most pieces begin as something you said in conversation and had not thought to write down. We research around it, verify what it claims, construct the argument and draft.</p>
<p>You see complete drafts, not outlines to approve. Your comments shape the next version, and the voice is calibrated until it reads as something you would actually say.</p>
<p>Where a piece needs evidence we cannot substantiate, we say so and change the argument rather than reaching for a plausible-sounding figure.</p>`,
    clientRole:
      'You review and approve everything before it is published. Nothing goes out carrying your name without your sign-off.',
  },
  {
    slug: 'learn-and-improve',
    position: 5,
    title: 'Learn and improve',
    summary: 'Observe what landed, with whom, and let that inform what comes next.',
    detailHtml: `<p>After publication we look at what actually happened: which arguments landed, with which audiences, and what conversations followed.</p>
<p>Some of this is measurable. A good deal of it is not — the right enquiry, the invitation from a credible platform, the colleague who now describes your work accurately. We report both honestly rather than privileging whichever is easier to count.</p>
<p>What we learn feeds back into the editorial plan. The position rarely changes; the arguments made within it should.</p>`,
    clientRole:
      'You tell us what you are seeing from your side — the conversations and opportunities we have no visibility of. That is often the most useful signal available.',
  },
];

export interface ArticleCategorySeed {
  slug: string;
  name: string;
  description: string;
  position: number;
}

export const ARTICLE_CATEGORIES: ArticleCategorySeed[] = [
  {
    slug: 'executive-visibility',
    name: 'Executive Visibility',
    description:
      'On being known for the right thing by the people who matter — positioning, presence and professional reputation.',
    position: 1,
  },
  {
    slug: 'thought-leadership',
    name: 'Thought Leadership',
    description:
      'On making arguments worth making: what distinguishes genuine thought leadership from restatement.',
    position: 2,
  },
  {
    slug: 'business-communication',
    name: 'Business Communication',
    description:
      'On the communications that carry weight — board papers, announcements, and the moments when words matter most.',
    position: 3,
  },
  {
    slug: 'content-strategy',
    name: 'Content Strategy',
    description:
      'On building communications that have a reason to exist and a system that sustains them.',
    position: 4,
  },
  {
    slug: 'professional-brand',
    name: 'Professional Brand',
    description:
      'On reputation as something built deliberately rather than accumulated by accident.',
    position: 5,
  },
  {
    slug: 'behind-the-work',
    name: 'Behind the Work',
    description:
      'How we approach the work: method, judgement and the reasoning behind editorial decisions.',
    position: 6,
  },
];

/**
 * Editorial pipeline, seeded as drafts.
 *
 * These are commissioning briefs, not finished pieces: each carries the
 * argument it is intended to make so an editor can pick it up. They are
 * DRAFT so the public site never presents an unwritten article as published.
 */
export interface ArticleSeed {
  slug: string;
  title: string;
  summary: string;
  categorySlug: string;
  tags: string[];
  bodyHtml: string;
}

export const ARTICLE_DRAFTS: ArticleSeed[] = [
  {
    slug: 'what-do-you-want-to-be-known-for',
    title: 'What do you want to be known for?',
    summary:
      'Most senior people have a public profile they did not choose. The question in the title is the one that replaces accident with a decision.',
    categorySlug: 'executive-visibility',
    tags: ['positioning', 'reputation'],
    bodyHtml: `<p><em>Editorial brief — draft. The argument this piece should make:</em></p>
<p>Professional reputation is usually accumulated rather than built. A conference invitation, a journalist's call, a post that performed unexpectedly well — and a public profile forms out of whatever happened to be said in those moments.</p>
<p>The piece should show why that profile so often mismatches the person: it emphasises a role they have outgrown, a sector they are leaving, or the topic they care least about. And it should argue that the corrective is a single decision, deliberately made, about what you want to be known for.</p>
<h2>Still to be developed</h2>
<ul><li>The distinction between being well known and being known for something.</li><li>Why a position that excludes things is worth more than one that fits everyone.</li><li>What changes, practically, once the decision is made.</li></ul>`,
  },
  {
    slug: 'the-difference-between-visibility-and-noise',
    title: 'The difference between visibility and noise',
    summary:
      'Posting frequently is not the same as being understood. On why volume is the wrong variable.',
    categorySlug: 'executive-visibility',
    tags: ['visibility', 'content strategy'],
    bodyHtml: `<p><em>Editorial brief — draft. The argument this piece should make:</em></p>
<p>Visibility advice defaults to frequency because frequency is easy to measure and easy to sell. The piece should argue that the variable that matters is legibility: whether a reader can tell, quickly, what you understand and why it is relevant to them.</p>
<h2>Still to be developed</h2>
<ul><li>Why high-volume presence often reduces clarity.</li><li>What a sustainable cadence looks like alongside a demanding role.</li><li>How to tell whether presence is working when the signals are not numeric.</li></ul>`,
  },
  {
    slug: 'why-most-thought-leadership-is-not',
    title: 'Why most thought leadership is not',
    summary:
      'Restatement delivered confidently is not an argument. What genuine thought leadership requires, and why it is rarer than the label suggests.',
    categorySlug: 'thought-leadership',
    tags: ['thought leadership', 'writing'],
    bodyHtml: `<p><em>Editorial brief — draft. The argument this piece should make:</em></p>
<p>A great deal of published thought leadership argues nothing. It observes, arranges familiar material, and concludes that the topic is important. The piece should set out the minimum conditions for the real thing: a position on something genuinely contested, evidence from actual work, and the willingness to say something a reasonable person might dispute.</p>
<h2>Still to be developed</h2>
<ul><li>The test: could an informed reader disagree with this?</li><li>Why standing matters as much as the argument.</li><li>How to find the argument you are already making privately.</li></ul>`,
  },
  {
    slug: 'writing-in-someone-elses-voice',
    title: 'Writing in someone else’s voice',
    summary:
      'What ghostwriting actually involves when the ideas have to be the client’s and the prose has to sound like them.',
    categorySlug: 'behind-the-work',
    tags: ['ghostwriting', 'method'],
    bodyHtml: `<p><em>Editorial brief — draft. The argument this piece should make:</em></p>
<p>Ghostwriting is widely misunderstood as either transcription or invention. The piece should describe the actual method: structured interviews as the source of both substance and phrasing, research to verify what the argument claims, and revision cycles that calibrate voice rather than polish prose.</p>
<h2>Still to be developed</h2>
<ul><li>Why recorded conversation beats a written brief.</li><li>How voice is calibrated, concretely.</li><li>Where the line sits between representing someone's thinking and inventing it.</li></ul>`,
  },
  {
    slug: 'the-board-paper-nobody-reads',
    title: 'The board paper nobody reads',
    summary:
      'On writing for readers who are short of time, sceptical by role, and deciding whether to trust your reasoning.',
    categorySlug: 'business-communication',
    tags: ['board communication', 'executive writing'],
    bodyHtml: `<p><em>Editorial brief — draft. The argument this piece should make:</em></p>
<p>Board papers fail in predictable ways: the recommendation arrives late, the reasoning is implied rather than shown, and the risks are handled in a way that reads as evasion. The piece should treat structure as the primary tool and show how order carries meaning when attention is scarce.</p>
<h2>Still to be developed</h2>
<ul><li>Why the recommendation belongs near the front.</li><li>How to present a risk without either minimising or dramatising it.</li><li>What the silence between paragraphs implies to a sceptical reader.</li></ul>`,
  },
  {
    slug: 'your-content-calendar-is-not-a-strategy',
    title: 'Your content calendar is not a strategy',
    summary:
      'A schedule describes when things happen. It does not say what they are for. On the difference, and why it matters.',
    categorySlug: 'content-strategy',
    tags: ['content strategy', 'editorial planning'],
    bodyHtml: `<p><em>Editorial brief — draft. The argument this piece should make:</em></p>
<p>Many organisations have a calendar and no strategy, and cannot tell the difference because the calendar is visibly busy. The piece should distinguish the two and argue that most content problems are upstream of production: a missing decision about purpose, claim and audience.</p>
<h2>Still to be developed</h2>
<ul><li>The diagnostic question: what is this supposed to achieve?</li><li>Message architecture as the document that resolves inconsistency.</li><li>Why sizing the plan to real capacity is a strategic decision, not an admission.</li></ul>`,
  },
  {
    slug: 'a-cv-is-not-a-professional-brand',
    title: 'A CV is not a professional brand',
    summary:
      'A record of roles held answers a different question from the one a reader is actually asking.',
    categorySlug: 'professional-brand',
    tags: ['professional brand', 'positioning'],
    bodyHtml: `<p><em>Editorial brief — draft. The argument this piece should make:</em></p>
<p>A CV answers "what have you done?". A professional brand answers "what do you understand, and why does that matter to me?". The piece should show why translating one into the other is not a formatting exercise, and why so much profile copy reads as a list of jobs.</p>
<h2>Still to be developed</h2>
<ul><li>The reader's actual question, and how rarely profiles answer it.</li><li>Expertise as a claim that needs evidence.</li><li>What to leave out, and why that is the hardest part.</li></ul>`,
  },
];

export interface FaqGroupSeed {
  slug: string;
  title: string;
  position: number;
  items: { question: string; answer: string }[];
}

export const FAQ_GROUPS: FaqGroupSeed[] = [
  {
    slug: 'working-with-inkvision',
    title: 'Working with InkVision',
    position: 1,
    items: [
      {
        question: 'Who do you typically work with?',
        answer:
          'Senior executives, founders, independent professionals and organisations with genuine expertise and a reason to communicate it — most often people who are well regarded by those who already know them and largely unknown beyond that circle. We are not a CV-writing service or a social-media posting service.',
      },
      {
        question: 'What does "voice-conscious" writing mean in practice?',
        answer:
          'It means the writing starts from how you actually speak. We work from recorded interviews rather than written briefs, so your phrasing, rhythm and emphasis are in the raw material from the beginning. Early pieces involve more revision while the voice is calibrated; it settles quickly, and nothing is published that does not sound like you.',
      },
      {
        question: 'I am not sure I have anything to say. Where do ideas come from?',
        answer:
          'Usually from work you have already done. We interview you about decisions you have made, problems you have solved and views you hold that diverge from the conventional one. Most people have more substance than they think and less time to extract it than they need.',
      },
      {
        question: 'Do you take on one-off projects or only ongoing engagements?',
        answer:
          'Both. Some engagements are self-contained — a keynote, a positioning exercise, a content audit. Others are ongoing programmes where consistency over time is the point. We will tell you which we think fits your situation, including when the smaller option is the right one.',
      },
    ],
  },
  {
    slug: 'outcomes-and-expectations',
    title: 'Outcomes and expectations',
    position: 2,
    items: [
      {
        question: 'What results can I expect?',
        answer:
          'We can make your expertise clear, credible and findable to the people who matter to you, and we can do it consistently. We cannot guarantee speaking invitations, media coverage, follower growth or new business, because those depend on factors none of us controls. Anyone promising otherwise is selling you something we would not.',
      },
      {
        question: 'How do you measure whether the work is succeeding?',
        answer:
          'We agree what to look at before we start, and it depends on the goal. Some indicators are countable — enquiry quality, engagement with specific arguments, how people arrive at your profile. Others are observed rather than measured, such as whether colleagues now describe your work accurately. We report both honestly rather than privileging whichever is easier to count.',
      },
      {
        question: 'How much of my time will this take?',
        answer:
          'Less than doing it yourself, but not nothing. Expect a recorded conversation and a review pass per piece of writing, plus more time up front during discovery and positioning. Your time is spent on substance and judgement; the drafting is ours.',
      },
    ],
  },
  {
    slug: 'confidentiality-and-approval',
    title: 'Confidentiality and approval',
    position: 3,
    items: [
      {
        question: 'Who approves what gets published?',
        answer:
          'You do, always. Nothing carrying your name is published without your explicit approval, and you see complete drafts rather than outlines. If a sentence does not sound like something you would say, it does not ship.',
      },
      {
        question: 'Is our work together confidential?',
        answer:
          'Yes. Much of what we do — particularly executive communications — involves material that is not public and in many cases never becomes public. Confidentiality is the default, we are glad to work under your own agreements, and we do not reference client work publicly without written permission.',
      },
      {
        question: 'Will you publish our engagement as a case study?',
        answer:
          'Only if you approve it, in writing, and only in the form you approve. Where we show illustrative work instead, it is clearly labelled as a sample or a concept so nobody mistakes it for commissioned client work.',
      },
    ],
  },
  {
    slug: 'resources-and-digital-products',
    title: 'Resources and digital products',
    position: 4,
    items: [
      {
        question: 'How do I buy a digital resource?',
        answer:
          'Purchasing is not open yet. The resources listed on the site show what is in preparation; each will become available once its pricing, payment and delivery have been set up and tested end to end. Until then you are welcome to get in touch and we will let you know when it opens.',
      },
      {
        question: 'How are digital products delivered?',
        answer:
          'By secure, time-limited download link, issued once payment has been confirmed. Links expire and have a download limit for security; if one expires you can generate a fresh one from your order page, and we are happy to help if anything goes wrong.',
      },
      {
        question: 'What are the refund terms?',
        answer:
          'Refund terms are published on each product page before purchase, and no product is made available for purchase until they are. We will not take payment for a resource whose terms have not been set.',
      },
    ],
  },
];

/**
 * Legal templates.
 *
 * Each is a workable starting point and is explicitly NOT legal advice. All
 * three are seeded with `awaitingReview: true`, which makes the website render
 * a visible notice, and the placeholders in square brackets are deliberate
 * prompts for the business to complete.
 */
export interface LegalPageSeed {
  slug: 'privacy' | 'terms' | 'refund_policy';
  title: string;
  bodyHtml: string;
}

export const LEGAL_PAGES: LegalPageSeed[] = [
  {
    slug: 'privacy',
    title: 'Privacy Notice',
    bodyHtml: `<p><strong>This page is a template awaiting review.</strong> It has not been checked by a qualified adviser and does not constitute legal advice. Placeholders in square brackets must be completed by InkVision Creatives before publication.</p>
<h2>Who we are</h2>
<p>InkVision Creatives ("we", "us") provides executive visibility and strategic communications services. For questions about this notice or about your personal data, contact us at [contact email address].</p>
<p>Our registered legal identity and place of establishment are [to be completed by the business].</p>
<h2>What we collect, and why</h2>
<h3>Enquiries</h3>
<p>When you submit the enquiry form we collect your name, work email address, the service you are interested in, your description of what you need, your indicated timeline and, if you choose to provide them, your organisation or role, an approximate budget range and how you heard about us.</p>
<p>We use this to respond to your enquiry and to assess whether we can help. We rely on your consent, which you give by ticking the consent box, and on our legitimate interest in responding to business enquiries.</p>
<h3>Newsletter</h3>
<p>If you subscribe we store your email address, any name you provide, and the date of your consent. Every email includes a one-click unsubscribe link.</p>
<h3>Technical information</h3>
<p>Our server records a one-way cryptographic hash of your IP address rather than the address itself, together with your browser's user-agent string. This is used to limit abuse of our forms. The hash cannot be reversed to recover your IP address.</p>
<h3>Purchases</h3>
<p>If you buy a digital resource we store your name, email address, order details and the payment provider's reference. We do not receive or store your card details: these are handled entirely by the payment provider.</p>
<h2>How long we keep it</h2>
<p>Enquiries are retained for [retention period to be decided] so that we can maintain continuity of correspondence. Newsletter records are kept until you unsubscribe, plus a short period thereafter to honour the unsubscribe. Order records are kept for [retention period, typically set by accounting requirements].</p>
<h2>Who we share it with</h2>
<p>We use third-party providers to operate the site: a hosting provider, a transactional email provider, and — once purchasing is enabled — a payment provider. Each processes data on our instructions. [List the specific providers once they are selected.]</p>
<p>We do not sell your personal data, and we do not share it for advertising.</p>
<h2>Your rights</h2>
<p>Depending on where you live, you may have the right to access the personal data we hold about you, to have it corrected or deleted, to object to or restrict its processing, to withdraw consent, and to receive a copy in a portable format. To exercise any of these, contact [contact email address].</p>
<p>[If the business is established in, or offers services into, the UK or EU, name the relevant supervisory authority and the right to complain to it. If the business is established in Nigeria, reference the Nigeria Data Protection Act 2023 and the Nigeria Data Protection Commission.]</p>
<h2>Cookies</h2>
<p>This website sets no advertising or analytics cookies. Session cookies are used only in the administration area, which is not public, and are strictly necessary for signing in.</p>
<h2>Changes</h2>
<p>We will update this notice when our practices change and will revise the date below.</p>`,
  },
  {
    slug: 'terms',
    title: 'Terms of Use',
    bodyHtml: `<p><strong>This page is a template awaiting review.</strong> It has not been checked by a qualified adviser and does not constitute legal advice. Placeholders in square brackets must be completed by InkVision Creatives before publication.</p>
<h2>About these terms</h2>
<p>These terms govern your use of this website. They do not govern any engagement for services, which is covered by a separate written agreement between us.</p>
<p>The site is operated by InkVision Creatives, [registered legal identity and address to be completed].</p>
<h2>Using this site</h2>
<p>You may read, share and link to the content on this site. You may not copy substantial portions of it for republication, use automated tools to extract its content at scale, attempt to access the administration area or any non-public part of the service, or interfere with its operation.</p>
<h2>Our content</h2>
<p>Unless stated otherwise, the writing, design and other material on this site belong to InkVision Creatives or are used with permission. Illustrative samples shown in our portfolio are labelled as samples or concepts; they are our own work, created to demonstrate approach, and do not represent commissioned client engagements. Commissioned work is shown only where the client has approved its publication.</p>
<h2>Enquiries are not an engagement</h2>
<p>Submitting an enquiry does not create a contract, a commitment to provide services, or any professional relationship. An engagement begins only when both parties have agreed written terms.</p>
<h2>No guarantees of outcome</h2>
<p>The content on this site, including articles and resources, is provided for general information. It is not advice for your specific circumstances. We make no representation that following it will produce any particular commercial, reputational or professional result.</p>
<h2>Digital resources</h2>
<p>Where digital resources are offered for sale, they are licensed for your personal or internal organisational use. You may not resell, redistribute or publish them. Specific terms, including refund terms, are stated on each product page and in our Refund Policy.</p>
<h2>Third-party links</h2>
<p>We link to other sites where it is useful. We do not control them and are not responsible for their content or practices.</p>
<h2>Liability</h2>
<p>[This section must be drafted by a qualified adviser for the relevant jurisdiction. Limitations of liability vary materially between jurisdictions and an unreviewed limitation may be unenforceable or, in some places, unlawful.]</p>
<h2>Governing law</h2>
<p>[Governing law and jurisdiction to be specified by the business on advice.]</p>
<h2>Changes</h2>
<p>We may update these terms. Continued use of the site after a change constitutes acceptance of the revised terms.</p>`,
  },
  {
    slug: 'refund_policy',
    title: 'Refund Policy',
    bodyHtml: `<p><strong>This page is a template awaiting review.</strong> It has not been checked by a qualified adviser and does not constitute legal advice. Placeholders in square brackets must be completed by InkVision Creatives before publication.</p>
<p><strong>Purchasing is not currently open.</strong> This policy is published in advance so that terms are visible before any resource is offered for sale. No digital resource will be made available for purchase until its specific refund terms have been set and reviewed.</p>
<h2>Scope</h2>
<p>This policy covers digital resources bought directly from this website. Services engagements are governed by their own written agreement.</p>
<h2>Digital resources</h2>
<p>Digital resources are delivered immediately by secure download link once payment is confirmed. [The business must decide and state its refund position here, for example: a stated number of days from purchase, conditional on download status, or a no-refund position where that is lawful in the relevant jurisdiction.]</p>
<p>[Note for review: consumer protection law in several jurisdictions grants a statutory cancellation right for digital content, which may be waived only with the customer's express acknowledgement before download. This section must be drafted with that in mind.]</p>
<h2>If something goes wrong</h2>
<p>If a download link fails, expires before you have used it, or the file is corrupt or not what the product page described, contact us at [contact email address] and we will put it right. A technical failure on our side is always our problem to fix, regardless of the refund position above.</p>
<h2>Duplicate and mistaken purchases</h2>
<p>If you are charged twice for the same resource, or bought one in error and have not downloaded it, contact us and we will refund the duplicate.</p>
<h2>How to request a refund</h2>
<p>Email [contact email address] with your order reference. We will acknowledge within [response time to be decided] and explain the outcome. Approved refunds are returned via the original payment method; timing then depends on the payment provider and your bank.</p>
<h2>Changes</h2>
<p>We may update this policy. The version in force at the time of your purchase is the one that applies to it.</p>`,
  },
];

/**
 * The initial resource listing.
 *
 * Seeded as COMING_SOON with no price, no file and no refund terms, because
 * none of those have been supplied. The API's own rules then make it
 * impossible to purchase, which is the accurate representation of its state.
 */
export const PRODUCT_SEED = {
  slug: 'personal-branding-blueprint-for-corporate-professionals',
  title: 'Personal Branding Blueprint for Corporate Professionals',
  subtitle: 'A structured approach to deciding what you want to be known for',
  summary:
    'A practical workbook for corporate professionals who are well regarded internally and largely invisible outside their organisation.',
  descriptionHtml: `<p>Most professional-brand advice assumes you want to be prominent. This resource assumes something narrower and more useful: that you want the right people to understand what you are good at, and that you have limited time to make that happen.</p>
<p>It works through the same sequence we use in client engagements — establishing what you have actually done, finding the position only you can hold, and deciding what to say and where — in a form you can complete on your own.</p>
<p><strong>This resource is in preparation.</strong> It is listed here so you can see what is coming. It will become available to purchase once its contents, pricing and delivery have been finalised and tested.</p>`,
  intendedAudience:
    'Mid-career and senior corporate professionals who are respected inside their organisation, are not yet visible outside it, and want to change that deliberately rather than by accident.',
  benefits: [
    'Decide what you want to be known for, in terms specific enough to act on',
    'Translate a record of roles into a statement of expertise',
    'Identify the audiences whose understanding of you would actually change something',
    'Build a presence you can sustain alongside a demanding role',
  ],
  contents: [
    'Part one: taking an honest inventory of your expertise',
    'Part two: finding the position only you can hold',
    'Part three: writing the profile that answers a reader’s real question',
    'Part four: choosing where to be present, and where not to be',
    'Part five: a sustainable cadence, and how to hold it',
    'Worksheets and prompts for each part',
  ],
  fileFormat: 'PDF',
  deliveryMethod: 'Secure, time-limited download link sent by email once payment is confirmed',
  seoTitle: 'Personal Branding Blueprint for Corporate Professionals',
  seoDescription:
    'A structured workbook for corporate professionals deciding what they want to be known for. In preparation.',
} as const;
