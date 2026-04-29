import type { StandardImageAsset } from '../types';
import { parseDate, DateTime } from '../utils/dates';
import { makeDataAccess, now, type BaseQueryOptions, type PortableTextBlock, makeDynamicDataAccess } from './sanity';

interface TheatreSeasonRaw {
  title: string;
  slug: string;
  description: PortableTextBlock[];
  preview_date: string;
  date_visible: string;
  isVisible: boolean;
}

export interface TheatreSeason extends Omit<TheatreSeasonRaw, 'preview_date' | 'date_visible'> {
  preview_date: DateTime;
  date_visible: DateTime;
}

export interface TheatreSeasonSlugs {
  slug: string;
  shows: string[];
}
interface QueryOptions extends BaseQueryOptions {
  season: string;
}

interface ShowDirectorRaw {
  _id: string;
  name?: string | null;
  title?: string | null;
  bio?: PortableTextBlock[] | null;
  headshot?: StandardImageAsset | null;
}

const VISIBLE_THEATRE_SEASONS = `_type == "season" && (dateTime(preview_date) < ${now} || dateTime(date_visible) < ${now})`;
const THEATER_SEASON_FIELDS = `title, "slug": slug.current, description, preview_date, date_visible, "isVisible": dateTime(date_visible) < ${now}`;

const SEASON_LIST = `*[${VISIBLE_THEATRE_SEASONS}] | order(date_visible desc) { ${THEATER_SEASON_FIELDS} }`;
const SINGLE_SEASON = ({ season }: QueryOptions) =>
  `*[${VISIBLE_THEATRE_SEASONS} && slug.current == "${season}"] | order(date_visible desc) { ${THEATER_SEASON_FIELDS} }[0]`;

const SEASON_SHOW_SLUGS = `*[${VISIBLE_THEATRE_SEASONS} && dateTime(date_visible) < ${now}] | order(date_visible desc)
    { "slug": slug.current, "shows": *[_type == "show" && references(^._id)].slug.current }`;

const SHOW_DIRECTOR_FIELDS = ({ picture }: BaseQueryOptions) => `{
      _id,
      name,
      "bio": coalesce(class_type_bio[class_type == "theatre"][0].bio, bio),
      ${picture('headshot')}
    }`;

const SHOW_FIELDS = ({ picture }: BaseQueryOptions) => `_id,
    title,
    ${picture('hero')},
    description,
    date_range,
    "season": season->{
      title,
      "slug": slug.current
    },
    "slug": slug.current,
    "directors": directors[]{
      "title": coalesce(title, "Director"),
      ...select(
        defined(instructor) => instructor->${SHOW_DIRECTOR_FIELDS({ picture })},
        defined(_ref) => @->${SHOW_DIRECTOR_FIELDS({ picture })}
      )
    },
    "participation_is_open": dateTime(participation.opens + "T00:00:00Z") < ${now} && dateTime(participation.deadline + "T00:00:00Z") > ${now},
    participation,
    "gallery": { ${picture('images.images[]', { as: 'images' })} },
    "program_pdf": program.asset->url,
    youtube_recording_url
`;
const SEASON_INFO = ({ season, picture }: QueryOptions) => `
*[${VISIBLE_THEATRE_SEASONS} && title == "${season}"] {
  "season": {${THEATER_SEASON_FIELDS}, ${picture('hero')}},
  "shows": *[_type == "show" && references(^._id)] | order(date_range.start) {
    ${SHOW_FIELDS({ picture })} 
  }
}[0]`;

interface ShowQueryOptions extends BaseQueryOptions {
  slug: string;
}

const AUDITION_LIST = ({
  picture,
}: BaseQueryOptions) => `*[_type == "show" && participation.deadline > now()] | order(participation.opens) {
  ${SHOW_FIELDS({ picture })}
}`;

const SHOW_INFO = ({ slug, picture }: ShowQueryOptions) => `
*[_type == "show" && slug.current == "${slug}" ] | order(date_range.start) {
  ${SHOW_FIELDS({ picture })}
}[0]
`;

function inflateSeasonDates(season: TheatreSeasonRaw): TheatreSeason {
  const date_visible = parseDate(season.date_visible);
  return {
    ...season,
    preview_date: parseDate(season.preview_date),
    date_visible,
  };
}

interface ShowRaw {
  _id: string;
  title: string;
  slug: string;
  hero: StandardImageAsset;
  description: PortableTextBlock[];
  season?: {
    title: string;
    slug: string;
  };
  date_range: {
    start: string;
    end: string;
  };
  directors?: (ShowDirectorRaw | null)[] | null;
  participation_is_open: boolean;
  participation?: {
    opens: string;
    deadline: string;
    registration_link: string;
    details: PortableTextBlock[];
  };
  gallery: {
    images: StandardImageAsset[];
  };
  program_pdf?: string;
  youtube_recording_url?: string | null;
}
export interface Show extends Omit<ShowRaw, 'date_range' | 'participation'> {
  gallery: {
    images: StandardImageAsset[];
  };
  date_range: {
    start: DateTime;
    end: DateTime;
  };
  participation?: {
    opens: DateTime;
    deadline: DateTime;
    registration_link: string;
    details: PortableTextBlock[];
  };
}

interface SeasonInfoRaw {
  season: TheatreSeasonRaw & { hero: StandardImageAsset };
  shows: ShowRaw[];
}

function processSeasonInfo(info: SeasonInfoRaw) {
  return {
    season: {
      ...inflateSeasonDates(info.season),
      hero: info.season.hero,
    },
    shows: info.shows.map(processShowInfo),
  };
}

function processShowInfo(show: ShowRaw): Show {
  const participationDeadline = show.participation?.deadline ? parseDate(show.participation.deadline) : DateTime.now();
  const participationOpen = show.participation?.opens
    ? parseDate(show.participation.opens)
    : DateTime.now().plus({ days: 1 });
  return {
    ...show,
    date_range: {
      start: parseDate(show.date_range.start),
      end: parseDate(show.date_range.end),
    },
    participation: show.participation && {
      opens: participationOpen,
      deadline: participationDeadline,
      registration_link: show.participation.registration_link,
      details: show.participation.details,
    },
  };
}

export const fetchAll = makeDataAccess(SEASON_LIST, (seasons: TheatreSeasonRaw[]) => seasons.map(inflateSeasonDates));
export const fetchOne = makeDynamicDataAccess(SINGLE_SEASON, (season: TheatreSeasonRaw) => inflateSeasonDates(season));
export const fetchSlugs = makeDataAccess<TheatreSeasonSlugs[]>(SEASON_SHOW_SLUGS);
export const fetchSeasonInfo = makeDynamicDataAccess(SEASON_INFO, processSeasonInfo);
export const fetchShowInfo = makeDynamicDataAccess(SHOW_INFO, processShowInfo);
export const fetchAuditions = makeDataAccess(AUDITION_LIST, (shows: ShowRaw[]) => shows.map(processShowInfo));
