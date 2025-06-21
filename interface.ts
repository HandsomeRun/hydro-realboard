export interface ResolverInput {
  name: string;
  duration: number;
  frozen: number;
  problems: {
    name: string;
    id: string;
  }[];
  teams: {
    id: string;
    name: string;
    avatar: string;
    institution: string;
    exclude: boolean;
  }[];
  submissions: {
    team: string;
    problem: string;
    verdict: string;
    time: number;
  }[];
} 