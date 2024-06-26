import groq from 'groq';
import { makeDataAccess, type BaseQueryOptions, type SanityImageObject } from './sanity';

interface Leadership {
  name: string;
  role: string;
  team: string;
  headshot: SanityImageObject;
}
export interface LeadershipTeam {
  board: Leadership[];
  theatre_artistic_directors: Leadership[];
}

const QUERY = ({ picture }: BaseQueryOptions) => groq`{
  "board": *[_type == "leadership" && team == "Board"] | order(name) {
    name,
    role,
    ${picture('headshot')}
  },
  "theatre_artistic_directors": *[_type == "leadership" && team == "Theatre Artistic Directors"] | order(name) {
    name,
    role,
    ${picture('headshot')}
  }
}
`;
export const fetchByTeam = makeDataAccess<LeadershipTeam>(QUERY);
