import type { PortableTextBlock } from 'sanity';
import type { BaseQueryOptions } from './sanity';
import { makeDataAccess } from './sanity';

export interface Page {
  _id: string;
  name: string;
  slug: {
    current: string;
  };
  heading: string;
  subheading: string;
  hero: string;
  body: PortableTextBlock[];
  meta_tite: string;
  meta_description: string;
  allow_indexing: boolean;
}

const QUERY_BASE = `*[_type == "page"]`;

const PAGE_QUERY = ({ picture }: BaseQueryOptions) => `${QUERY_BASE} {
  _id,
  name,
  slug,
  heading,
  subheading,
  ${picture('hero')},
  body,
  meta_title,
  meta_description,
  allow_indexing
}`;

export const fetchAll = makeDataAccess<Page[]>(PAGE_QUERY);

const PATHS_QUERY = `${QUERY_BASE} {
  slug
}`;

export const fetchAllPaths = makeDataAccess<string[]>(PATHS_QUERY);