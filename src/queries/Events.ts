import {
  groqDateTimeFromDate,
  makeDataAccess,
  makeDynamicDataAccess,
  type BaseQueryOptions,
  type PortableTextBlock,
} from './sanity';
import type { DateTime } from 'luxon';
import { now, nowDateTime } from './sanity';
import { parseDate } from '../utils/dates';
import type { StandardImageAsset } from '../types';

interface RelatedEntityRaw {
  _type: 'show' | 'class' | string;
  _id: string;
  title: string | null;
  slug?: string | null;
  seasonSlug?: string | null;
  class_type?: string | null;
}

export interface RelatedEntity {
  type: 'show' | 'class';
  title: string;
  href: string;
}

interface EventRaw {
  dates: EventDateRaw[];
  publish_date: string;
  ticket_link: string | null;
  description: null | PortableTextBlock[];
  thumbnail: StandardImageAsset | null;
  hero: StandardImageAsset | null;
  announcement: {
    headline: string;
    description: string;
  };
  slug: string;
  title: string;
  location: string;
  related_entities: RelatedEntityRaw[] | null;
}

interface EventDateRaw {
  date: string;
  note?: PortableTextBlock[] | null;
}

interface EventParsed extends Omit<EventRaw, 'dates' | 'publish_date' | 'related_entities'> {
  dates: EventDate[];
  publish_date: DateTime;
  related_entities: RelatedEntity[];
}

export interface EventDate {
  date: DateTime;
  note: PortableTextBlock[];
}

interface RelatedQueryOpts extends BaseQueryOptions {
  classType?: string;
  show?: string;
}

const EVENT_FIELDS = ({ picture }: BaseQueryOptions) => `
  dates,
  "slug": slug.current,
  announcement,
  title,
  location,
  publish_date,
  ticket_link,
  description,
  "related_entities": related_entities[]->{
    _type,
    _id,
    title,
    class_type,
    "slug": slug.current,
    "seasonSlug": season->slug.current
  },
  ${picture('thumbnail')},
  ${picture('hero')}
`;
const RELATED_EVENTS_QUERY = ({ classType, show, picture }: RelatedQueryOpts) => `
*[_type=="event"
  && ${groqDateTimeFromDate('publish_date')} < ${now}
  ${classType ? `&& "class" in related_entities[]->_type && "${classType}" in related_entities[]->class_type` : ''}
  ${show ? `&& "show" in related_entities[]->_type && "${show}" in related_entities[]->slug.current` : ''}
  && count(dates[date > now()]) > 0] { ${EVENT_FIELDS({ picture })} }
`;

interface EventDetailsQueryOpts extends BaseQueryOptions {
  eventSlug: string;
}

const FEATURED_EVENTS_QUERY = ({ picture }: BaseQueryOptions) => `
*[_type=="event"
  && announce
  && ${groqDateTimeFromDate('publish_date')} < ${now}
  && count(dates[date > now()]) > 0] | order(dates[0].date) {
    ${EVENT_FIELDS({ picture })}
  }
`;

const UPCOMING_EVENTS_QUERY = ({ picture }: BaseQueryOptions) => `
*[_type=="event"
  && ${groqDateTimeFromDate('publish_date')} < ${now}
  && count(dates[date > now()]) > 0] {
    ${EVENT_FIELDS({ picture })}
  }
`;

const EVENT_DETAILS = ({ eventSlug, picture }: EventDetailsQueryOpts) =>
  `*[_type=="event" && slug.current == "${eventSlug}"] { ${EVENT_FIELDS({ picture })} }`;

function processResults(raw: EventRaw[]): EventParsed[] {
  return raw.map((event) => ({
    ...event,
    dates: event.dates.map((performance) => ({
      date: parseDate(performance.date),
      note: performance.note ?? [],
    })),
    publish_date: parseDate(event.publish_date),
    related_entities: normalizeRelatedEntities(event.related_entities),
  }));
}

function normalizeRelatedEntities(entities: EventRaw['related_entities']): RelatedEntity[] {
  return (entities ?? []).flatMap((entity): RelatedEntity[] => {
    if (entity._type === 'show' && entity.title && entity.slug && entity.seasonSlug) {
      return [
        {
          type: 'show' as const,
          title: entity.title,
          href: `/theatre/${entity.seasonSlug}/${entity.slug}/`,
        },
      ];
    }

    if (entity._type === 'class' && entity.title && entity._id && entity.class_type) {
      return [
        {
          type: 'class' as const,
          title: entity.title,
          href: `/${entity.class_type.toLowerCase()}/#class-${entity._id}`,
        },
      ];
    }

    return [];
  });
}

function processUpcomingResults(raw: EventRaw[]): EventParsed[] {
  return processResults(raw)
    .map((event) => ({
      ...event,
      dates: event.dates.filter((performance) => performance.date.toMillis() > nowDateTime.toMillis()),
    }))
    .filter((event) => event.dates.length > 0)
    .sort((a, b) => a.dates[0].date.toMillis() - b.dates[0].date.toMillis());
}

export const getRelatedEvents = makeDynamicDataAccess(RELATED_EVENTS_QUERY, processResults);
export const lookupEvent = makeDynamicDataAccess(EVENT_DETAILS, processResults);
export const getFeaturedEvents = makeDynamicDataAccess(FEATURED_EVENTS_QUERY, processResults);
export const getUpcomingEvents = makeDataAccess(UPCOMING_EVENTS_QUERY, processUpcomingResults);

export type { EventParsed as Event };
