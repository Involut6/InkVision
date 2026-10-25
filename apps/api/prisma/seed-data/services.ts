/**
 * Initial service content, taken from the InkVision Creatives strategy and
 * content brief.
 *
 * These are the four principal service categories. Everything here is the
 * studio's own positioning copy — no client names, outcomes or statistics are
 * invented anywhere in this file.
 */
export interface ServiceSeed {
  slug: string;
  title: string;
  tagline: string;
  businessNeed: string;
  audience: string;
  icon: string;
  position: number;
  problemHtml: string;
  approachHtml: string;
  components: { title: string; description: string }[];
  deliverables: string[];
  processStages: { title: string; summary: string; detail: string }[];
  faqs: { question: string; answer: string }[];
  ctaHeadline: string;
  ctaBody: string;
  seoTitle: string;
  seoDescription: string;
}

export const SERVICE_SEEDS: ServiceSeed[] = [
  {
    slug: 'executive-visibility',
    title: 'Executive Visibility',
    tagline: 'Be known for the right thing, by the people who matter.',
    businessNeed:
      'You are respected inside your organisation but largely unknown outside it — and that gap is costing you opportunities you never hear about.',
    audience:
      'Senior executives, founders and professionals whose reputation currently depends on who already knows them.',
    icon: 'Eye',
    position: 1,
    problemHtml: `<p>Most senior people become visible by accident. A conference invitation arrives, a journalist calls, a post performs unexpectedly well — and a public profile forms out of whatever happened to be said in those moments.</p>
<p>The result is a presence that does not quite match the person. It may emphasise a role they have outgrown, a sector they are leaving, or a topic they care least about. Meanwhile the expertise they would most like to be known for stays private.</p>
<p>Executive visibility work replaces that accident with a decision. It starts from what you want to be known for, identifies who needs to understand it, and builds a presence that reflects both.</p>`,
    approachHtml: `<p>We begin with interviews rather than templates. Before anything is written we need to understand the work you have actually done, the arguments you have formed in doing it, and the audiences whose understanding of you would change something.</p>
<p>From there we define a position: a clear, defensible statement of the territory you occupy and the point of view you bring to it. That position governs every later decision — what to write, where to appear, what to decline.</p>
<p>Execution follows the position, not the other way round. Profiles, biographies, speaker materials and platform presence are then built as expressions of one coherent idea rather than as separate exercises.</p>`,
    components: [
      {
        title: 'Positioning and narrative development',
        description:
          'A defined professional position: the territory you occupy, the perspective you bring, and the language that makes both legible to people encountering you for the first time.',
      },
      {
        title: 'Executive profile and biography suite',
        description:
          'Long-form, short-form and introduction-length biographies, written to be used rather than filed — consistent in substance, adapted in length and register.',
      },
      {
        title: 'LinkedIn and professional platform presence',
        description:
          'Profile structure, headline, about section and featured content, treated as a professional publication rather than a CV.',
      },
      {
        title: 'Speaker and media materials',
        description:
          'Speaker one-pagers, topic outlines, session descriptions and introduction copy for event hosts and programme committees.',
      },
      {
        title: 'Visibility planning',
        description:
          'A considered view of where presence is worth building, and — just as importantly — where it is not.',
      },
    ],
    deliverables: [
      'Positioning statement and narrative brief',
      'Biography suite (long, medium and short forms)',
      'LinkedIn profile copy and structure recommendations',
      'Speaker one-pager with topic outlines',
      'Visibility plan with prioritised platforms and formats',
    ],
    processStages: [
      {
        title: 'Discovery interviews',
        summary:
          'Two to three structured conversations about your work, your thinking and your goals.',
        detail:
          'We ask about the decisions you have made, the arguments you have changed your mind about, and the moments your expertise mattered. This is where the raw material comes from.',
      },
      {
        title: 'Audience and context research',
        summary: 'Who needs to understand you, and what they currently see.',
        detail:
          'We review your existing public presence, the conversations happening in your field, and how comparable figures are positioned — not to imitate them, but to find the space you can hold distinctly.',
      },
      {
        title: 'Positioning definition',
        summary: 'A single, agreed statement of what you want to be known for.',
        detail:
          'We propose a position and test it with you. It has to be true, defensible and specific enough to exclude things — a position that fits everyone describes no one.',
      },
      {
        title: 'Writing and refinement',
        summary: 'Drafting, your review, and revision until the voice is yours.',
        detail:
          'Every deliverable goes through at least one full round of your comments. If a sentence does not sound like something you would say, it does not ship.',
      },
      {
        title: 'Handover and planning',
        summary: 'Materials, guidance and a plan you can act on without us.',
        detail:
          'You receive the finished materials plus the reasoning behind them, so future decisions can be made consistently whether or not we are involved.',
      },
    ],
    faqs: [
      {
        question: 'Will this turn me into someone who posts constantly?',
        answer:
          'No. Visibility is a function of clarity and consistency, not volume. For most of the people we work with, a smaller amount of genuinely considered material outperforms frequent posting — and is far more sustainable alongside a demanding role.',
      },
      {
        question: 'I am not comfortable talking about myself. Does that rule this out?',
        answer:
          'It is one of the most common reasons people come to us. The work is largely about making your expertise visible rather than making you prominent — talking about the problem you understand, rather than about yourself.',
      },
      {
        question: 'Can you guarantee speaking invitations or media coverage?',
        answer:
          'No, and we would be wary of anyone who did. We can make you findable, legible and credible to the people who issue those invitations. Whether they issue them depends on factors none of us control.',
      },
    ],
    ctaHeadline: 'What do you want to be known for?',
    ctaBody:
      'Tell us where you are now and what you are working towards. We will tell you honestly whether executive visibility work is the right next step.',
    seoTitle: 'Executive Visibility | InkVision Creatives',
    seoDescription:
      'Positioning, profiles and professional presence for senior people whose expertise deserves to be understood outside their own organisation.',
  },
  {
    slug: 'thought-leadership-ghostwriting',
    title: 'Thought Leadership & Ghostwriting',
    tagline: 'Your ideas, properly argued, in your own voice.',
    businessNeed:
      'You have a point of view worth publishing and no realistic path to writing it yourself at the standard it deserves.',
    audience:
      'Executives, founders and specialists with substantive expertise and no spare capacity to write.',
    icon: 'PenLine',
    position: 2,
    problemHtml: `<p>Thought leadership has a reputation problem, and it has earned it. A great deal of what carries the label is restatement — familiar observations, arranged confidently, arguing nothing.</p>
<p>Genuine thought leadership is simply a clear argument, made by someone with the standing to make it, about something that is actually contested. It requires a position, evidence from real work, and the willingness to say something a reasonable person might disagree with.</p>
<p>That is difficult to produce at pace while running an organisation. It is what ghostwriting is for.</p>`,
    approachHtml: `<p>Ghostwriting at this level is not transcription and it is not invention. It is a structured process for getting what you already know out of your head and onto the page in a form that holds up to scrutiny.</p>
<p>We interview you, research around what you have said, construct the argument, and draft. You review. We revise. Nothing is published that you have not approved, and nothing claims expertise you do not have.</p>
<p>Where a piece needs evidence we do not have, we say so and either find it or change the argument. We never fill a gap with a plausible-sounding figure.</p>`,
    components: [
      {
        title: 'Editorial strategy and theme development',
        description:
          'A small number of themes you can credibly own, with the arguments to be made within each, sequenced over time.',
      },
      {
        title: 'Long-form articles and essays',
        description:
          'Substantive pieces built from interview material and research, structured as arguments rather than lists.',
      },
      {
        title: 'LinkedIn articles and professional commentary',
        description:
          'Shorter work that carries a real point of view, written for a professional reader rather than an algorithm.',
      },
      {
        title: 'Opinion pieces and contributed articles',
        description:
          'Pieces shaped for the specific publication and readership they are intended for.',
      },
      {
        title: 'Newsletters and recurring series',
        description:
          'Sustainable formats that compound over time, with a cadence matched to your actual availability.',
      },
      {
        title: 'Interview-based content development',
        description:
          'Regular structured conversations that keep a publishing programme supplied without adding writing to your week.',
      },
    ],
    deliverables: [
      'Editorial strategy with themes and a publishing sequence',
      'Interview programme with structured transcripts',
      'Drafted pieces, revised through your review',
      'A voice and style reference for consistency across writers and time',
    ],
    processStages: [
      {
        title: 'Theme definition',
        summary: 'What you are in a position to argue, and what you are not.',
        detail:
          'We identify a small number of areas where your experience gives you standing, and the specific arguments within them worth making publicly.',
      },
      {
        title: 'Interview and capture',
        summary: 'Structured conversations that generate the substance.',
        detail:
          'Recorded, transcribed interviews are the raw material. Most pieces begin as something you said in conversation and had not thought to write down.',
      },
      {
        title: 'Research and verification',
        summary: 'Checking what the piece claims before it claims it.',
        detail:
          'We locate supporting evidence, check the surrounding conversation, and flag anything we cannot substantiate so the argument can be adjusted rather than overstated.',
      },
      {
        title: 'Drafting and your review',
        summary: 'A full draft, your comments, and revision.',
        detail:
          'You see complete drafts, not outlines to approve. Your edits shape the next version, and the voice is tuned until it reads as yours.',
      },
      {
        title: 'Publication and iteration',
        summary: 'Publish, observe, and let what you learn inform the next piece.',
        detail:
          'We review which arguments landed and with whom, and feed that back into the editorial plan.',
      },
    ],
    faqs: [
      {
        question: 'Will it actually sound like me?',
        answer:
          'That is the entire test. We work from recorded interviews precisely so the writing starts from your own phrasing, rhythm and emphasis. Early pieces involve more revision while the voice is calibrated; it settles quickly.',
      },
      {
        question: 'How much of my time does this take?',
        answer:
          'Substantially less than writing it yourself, but it is not zero. Expect a recorded conversation and a review pass per piece. Nothing is published without your approval, so your time is spent on judgement rather than drafting.',
      },
      {
        question: 'What if I do not know what to write about?',
        answer:
          'Most people do not, at first. Finding the argument is part of the work — usually by interviewing you about decisions you have made and noticing where your view diverges from the conventional one.',
      },
      {
        question: 'Is ghostwriting honest?',
        answer:
          'It is when the ideas are genuinely yours and you have approved what is published. We write what you think, with your involvement and sign-off. We will not write claims you cannot stand behind.',
      },
    ],
    ctaHeadline: 'What argument have you been meaning to make?',
    ctaBody:
      'If there is something you keep saying in meetings that belongs in public, that is usually where we start.',
    seoTitle: 'Thought Leadership & Ghostwriting | InkVision Creatives',
    seoDescription:
      'Interview-led ghostwriting and editorial strategy for executives with a genuine point of view and no time to write it.',
  },
  {
    slug: 'strategic-content-communications',
    title: 'Strategic Content & Communications',
    tagline: 'Content with a reason to exist.',
    businessNeed:
      'Your organisation produces a steady stream of content and cannot say what any of it is for.',
    audience:
      'Organisations, practices and teams whose communications have grown by accumulation rather than design.',
    icon: 'LayoutGrid',
    position: 3,
    problemHtml: `<p>Most content problems are not writing problems. The posts go out, the pages exist, the newsletter ships — and none of it adds up to anything, because no one decided what it was supposed to achieve.</p>
<p>The symptoms are recognisable: a calendar that exists to be filled, channels maintained out of obligation, messaging that varies depending on who wrote it, and no way to tell whether any of it is working.</p>
<p>The fix is upstream. Decide what the communications are for, what the organisation is actually claiming, and who needs to hear it. The production problem usually solves itself after that.</p>`,
    approachHtml: `<p>We start with an audit, not a calendar. What exists, what it says, where it contradicts itself, and what it is quietly costing to maintain.</p>
<p>From there we build a message architecture: the core claim, the supporting arguments, and the proof available for each. This is the document that stops five people describing the organisation five different ways.</p>
<p>Only then do we design the system — formats, cadence, ownership and review — and size it to the capacity the organisation genuinely has, not the capacity it wishes it had.</p>`,
    components: [
      {
        title: 'Content audit and assessment',
        description:
          'An honest account of what exists, what it achieves, and what should be retired.',
      },
      {
        title: 'Message architecture',
        description:
          'The core claim and supporting arguments, with the evidence available for each, in one agreed document.',
      },
      {
        title: 'Content strategy and editorial planning',
        description: 'Themes, formats and cadence chosen for a purpose and sized to real capacity.',
      },
      {
        title: 'Website and key page copy',
        description:
          'Homepage, service and about pages written to do a job rather than to fill a template.',
      },
      {
        title: 'Brand voice and editorial guidelines',
        description:
          'Practical guidance that lets several people write with one voice, with examples rather than adjectives.',
      },
      {
        title: 'Internal and stakeholder communications',
        description:
          'Announcements, updates and briefings that respect the reader’s time and attention.',
      },
    ],
    deliverables: [
      'Content audit with findings and recommendations',
      'Message architecture document',
      'Content strategy with themes, formats and cadence',
      'Editorial guidelines and voice reference',
      'Key page copy, where in scope',
    ],
    processStages: [
      {
        title: 'Audit and diagnosis',
        summary: 'Review what exists and identify what is actually wrong.',
        detail:
          'We read everything, map where messages diverge, and establish which problems are strategic and which are simply production.',
      },
      {
        title: 'Message definition',
        summary: 'Agree the central claim and what supports it.',
        detail:
          'Developed with your team and tested against the evidence you can actually show. A claim without proof is removed, not softened.',
      },
      {
        title: 'System design',
        summary: 'Formats, cadence, ownership and review.',
        detail:
          'A plan that is realistic for your capacity. An ambitious schedule nobody can sustain is worse than a modest one that runs.',
      },
      {
        title: 'Production and review',
        summary: 'Write the priority material and establish the review habit.',
        detail:
          'We produce the pieces that matter most and set up a review process your team can run themselves.',
      },
      {
        title: 'Measurement and adjustment',
        summary: 'Decide what to watch, then act on it.',
        detail:
          'A small number of meaningful indicators, reviewed on a regular rhythm, with the plan adjusted in response.',
      },
    ],
    faqs: [
      {
        question: 'Do we have to stop everything while this happens?',
        answer:
          'No. Ongoing communications continue through the engagement. The strategy work runs alongside, and the changes are introduced as each part is agreed.',
      },
      {
        question: 'Can you work with our in-house team rather than replacing them?',
        answer:
          'That is the most common arrangement. We tend to be most useful on strategy, message architecture and editorial standards, with your team doing the day-to-day production against a clear framework.',
      },
      {
        question: 'How do you measure whether it worked?',
        answer:
          'We agree the indicators up front and they depend on the goal. Some are measurable, such as enquiry quality or page engagement. Others, such as whether the organisation is described consistently by its own people, are assessed rather than counted. We will not invent a metric to manufacture a success.',
      },
    ],
    ctaHeadline: 'What is your content supposed to achieve?',
    ctaBody:
      'If that question is harder to answer than it should be, a content audit is usually the cheapest place to start.',
    seoTitle: 'Strategic Content & Communications | InkVision Creatives',
    seoDescription:
      'Content audits, message architecture and editorial systems for organisations whose communications have outgrown their strategy.',
  },
  {
    slug: 'executive-communications',
    title: 'Executive Communications',
    tagline: 'The words that carry weight.',
    businessNeed:
      'You have something consequential to say — to a board, a workforce, a market — and one chance to say it well.',
    audience:
      'Leaders facing high-stakes communication: board papers, all-hands moments, keynotes, difficult announcements.',
    icon: 'Mic',
    position: 4,
    problemHtml: `<p>Some communications carry more weight than others. A restructuring announcement, a board paper that must land a difficult recommendation, a keynote that defines how a market sees you, a letter to shareholders during a bad quarter.</p>
<p>These are not content exercises. They are moments where the wrong emphasis costs trust that takes years to rebuild, and where the person speaking rarely has the distance to see how their words will read to the people receiving them.</p>
<p>The work is partly writing and substantially judgement: anticipating how a sentence lands with an audience that is anxious, sceptical, or deciding whether to believe you.</p>`,
    approachHtml: `<p>We start with the decision, not the document. What has to be understood, by whom, and what they are likely to feel while hearing it. Most failed executive communications fail because they answered the wrong question clearly.</p>
<p>Then we draft — and stress-test. We read the piece as its hardest audience: the employee who will lose a colleague, the board member who disagreed, the analyst looking for the thing you did not say.</p>
<p>For spoken material, we work on the delivered version, not the written one. A sentence that reads well and cannot be said aloud is a defect.</p>`,
    components: [
      {
        title: 'Keynotes and conference presentations',
        description:
          'A structured argument built for the room, written to be spoken and rehearsed rather than read.',
      },
      {
        title: 'Board and investor communications',
        description:
          'Board papers, updates and shareholder letters that make the recommendation clear and the reasoning visible.',
      },
      {
        title: 'Internal leadership communications',
        description:
          'All-hands remarks, organisational announcements and change communications written for the people receiving them.',
      },
      {
        title: 'Sensitive and crisis communications',
        description:
          'Difficult messages handled with care, candour and attention to what the audience most needs to know first.',
      },
      {
        title: 'Message preparation and briefing notes',
        description:
          'Key messages, anticipated questions and honest answers, prepared before the conversation rather than during it.',
      },
    ],
    deliverables: [
      'Drafted speech, paper or announcement, revised through your review',
      'Key messages and anticipated-question briefing',
      'Speaker notes prepared for delivery',
      'Where relevant, a sequencing plan across audiences',
    ],
    processStages: [
      {
        title: 'Context and intent',
        summary: 'Establish what has to be achieved and what is at stake.',
        detail:
          'We need the full picture, including the parts that will not be said publicly, to judge what the communication can and cannot do.',
      },
      {
        title: 'Audience analysis',
        summary: 'Who is receiving this, and in what state.',
        detail:
          'A message to a workforce expecting bad news is a different document from the same message to a market expecting good news.',
      },
      {
        title: 'Structure and drafting',
        summary: 'Build the argument, then write it.',
        detail:
          'Order carries meaning in high-stakes communication. We settle the structure before polishing sentences.',
      },
      {
        title: 'Stress-testing and revision',
        summary: 'Read it as the hardest audience would.',
        detail:
          'We look for what could be misread, what will be quoted out of context, and what the silence between paragraphs implies.',
      },
      {
        title: 'Delivery preparation',
        summary: 'Rehearsal notes, timing and anticipated questions.',
        detail:
          'For spoken material we work through delivery, because a good text delivered badly is still a failed communication.',
      },
    ],
    faqs: [
      {
        question: 'How quickly can you turn something around?',
        answer:
          'It depends on the stakes and the material available. Some pieces can move in days. We would rather tell you a timeline is too tight than produce something consequential that has not been properly tested.',
      },
      {
        question: 'Will you tell me if you think the message itself is wrong?',
        answer:
          'Yes. If the communication is being asked to do something it cannot do, saying so is more useful than writing it well. The decision remains yours.',
      },
      {
        question: 'Is everything confidential?',
        answer:
          'Yes. Executive communications work routinely involves material that is not public and in many cases never becomes public. Confidentiality is assumed, and we are glad to work under your own agreements.',
      },
    ],
    ctaHeadline: 'What do you need to say?',
    ctaBody:
      'If something consequential is coming and you want it handled properly, tell us the situation and the timeline.',
    seoTitle: 'Executive Communications | InkVision Creatives',
    seoDescription:
      'Keynotes, board papers and high-stakes announcements prepared with the judgement these moments require.',
  },
];
