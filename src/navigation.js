import { SITE } from '~/utils/config.ts';

import { fetchAll as fetchAllSeasons } from '~/queries/TheatreSeasons';
import { fetchMenuPages } from '~/queries/Pages';

const seasons = await fetchAllSeasons();
const pages = await fetchMenuPages();

const getPageMenuItems = (menu) => {
  let menuItems = pages
    .filter((page) => page.menu_dropdown == menu)
    .map((page) => {
      return {
        text: page.name,
        href: `${SITE.base}/${page.slug.current}/`,
      };
    });
  return menuItems;
};

export const headerData = {
  links: [
    {
      id: 'about',
      text: 'About',
      links: [
        {
          text: 'Mission and Vision',
          href: `${SITE.base}/about/`,
        },
        {
          text: 'Leadership',
          href: `${SITE.base}/leadership/`,
        },
        {
          text: 'FAQs',
          href: `${SITE.base}/faqs/`,
        },
        {
          text: 'Newsletter',
          href: `${SITE.base}/newsletter/`,
        },
        {
          text: 'Contact Us',
          href: `${SITE.base}/contact/`,
        },
        {
          text: 'Merch',
          href: 'https://www.care.com/connect/tcha/?category=products',
        },
        ...getPageMenuItems('About'),
      ],
    },
    {
      id: 'classes',
      text: 'Classes',
      links: [
        {
          text: 'Registration',
          href: `${SITE.base}/registration/`,
          dividerAfter: true,
        },
        {
          text: 'Choir',
          href: `${SITE.base}/choir/`,
        },
        {
          text: 'Dance',
          href: `${SITE.base}/dance/`,
        },
        {
          text: 'Drama',
          href: `${SITE.base}/drama/`,
        },
        {
          text: 'Lessons',
          href: `${SITE.base}/lessons/`,
        },
        ...getPageMenuItems('Classes'),
      ],
    },
    {
      id: 'theatre',
      text: 'Theatre',
      links: [
        {
          text: 'Auditions',
          href: `${SITE.base}/auditions/`,
          dividerAfter: true,
        },
        {
          text: 'Gala',
          href: 'https://tchagala2026.rsvpify.com',
          dividerAfter: true,
        },
        ...seasons.map((s) => {
          if (!s.isVisible) {
            return { text: `${s.title} Season (coming soon!)` };
          }
          return { text: `${s.title} Season`, href: `${SITE.base}/theatre/${s.title}/` };
        }),
        ...getPageMenuItems('Theatre'),
      ],
    },
    {
      id: 'events',
      text: 'Events',
      links: [
        {
          text: 'Calendar',
          href: `${SITE.base}/events/`,
        },
        ...getPageMenuItems('Events'),
      ],
    },
  ],
  actions: [
    { text: 'Donate', href: 'https://www.paypal.com/donate/?hosted_button_id=6PSJWMWAEXSC2', target: '_blank' },
  ],
};

export const footerData = {
  links: [
    {
      title: 'Info',
      links: [
        { text: 'About Us', href: `${SITE.base}/about/` },
        { text: 'FAQ', href: `${SITE.base}/faqs/` },
        { text: 'Contact Us', href: `${SITE.base}/contact/` },
        { text: 'Merch', href: 'https://www.care.com/connect/tcha/?category=products' },
      ],
    },
    {
      title: 'Education',
      links: [
        { text: 'Registration', href: `${SITE.base}/registration/` },
        { text: 'Choir', href: `${SITE.base}/choir/` },
        { text: 'Dance', href: `${SITE.base}/dance/` },
        { text: 'Drama', href: `${SITE.base}/drama/` },
        { text: 'Lessons', href: `${SITE.base}/lessons/` },
      ],
    },
    {
      title: 'Events',
      links: [
        { text: 'Theatre', href: '/theatre/2025-2026/' },
        { text: 'Calendar', href: '/events/' },
      ],
    },
  ],
  secondaryLinks: [],
  socialLinks: [
    { ariaLabel: 'Instagram', icon: 'tabler:brand-instagram', href: 'https://www.instagram.com/tcha_mn' },
    {
      ariaLabel: 'Facebook',
      icon: 'tabler:brand-facebook',
      href: 'https://www.facebook.com/profile.php?id=100070871785399',
    },
    {
      ariaLabel: 'YouTube',
      icon: 'tabler:brand-youtube',
      href: 'https://www.youtube.com/channel/UCpZfhXP2mX96T1fSM29-nLA',
    },
  ],
  // `<span class="w-5 h-5 md:w-6 md:h-6 md:-mt-0.5 bg-cover mr-1.5 rtl:mr-0 rtl:ml-1.5 float-left rtl:float-right rounded-sm bg-[url(https://onwidget.com/favicon/favicon-32x32.png)]"></span>
  footNote: `&copy; ${new Date().getFullYear()} Twin Cities Homeschoolers for the Arts
  `,
};
