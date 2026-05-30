import groq from 'groq';
import { makeDataAccess, type BaseQueryOptions } from './sanity';
import type { StandardImageAsset } from '../types';

interface Leadership {
  name: string;
  role: string;
  team: string;
  headshot: StandardImageAsset;
}
export interface LeadershipTeam {
  board: Leadership[];
  staff: Leadership[];
}

const QUERY = ({ picture }: BaseQueryOptions) => groq`{
  "board": *[_type == "leadership" && team == "Board"] | order(name) {
    name,
    role,
    ${picture('headshot')}
  },
  "staff": *[_type == "leadership" && team == "Staff"] | order(name) {
    name,
    role,
    ${picture('headshot')}
  }
}
`;
export const fetchByTeam = makeDataAccess<LeadershipTeam>(QUERY);
