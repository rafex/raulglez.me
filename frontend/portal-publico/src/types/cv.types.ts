export interface CVData {
  header: Header;
  contact: Contact;
  about: string;
  education?: EducationItem[];
  experience: ExperienceItem[];
  skills: Skills;
  certifications: Certification[];
  conferences: Conference[];
  articles?: Article[];
  projects: Project[];
  highlight_semantic?: HighlightSemanticMap;
}

export interface Header {
  nickname?: string;
  name: string;
  lastname?: string;
  fullname?: string;
  title: string;
  role: string;
  vision: string;
}

export interface Contact {
  public?: {
    email?: string;
    website?: string;
  };
  private?: {
    phone?: string;
    email?: string;
    location?: string;
  };
}

export interface ExperienceItem {
  role: string;
  company: string;
  period: string;
  location: string;
  highlights: string[];
  skills?: {
    technical: Array<string | { name: string; experienceYears?: number }>;
    competencies: string[];
  };
}

export interface Skills {
  technical: Array<string | { name: string; experienceYears?: number }>;
  competencies: string[];
}

export interface EducationItem {
  degree: string;
  institution: string;
  location: string;
  period: string;
}

export interface Certification {
  title: string;
  issuer?: string;
  code?: string;
  expedition?: string;
  id?: string;
}

export interface Conference {
  title: string;
  event: string;
  location: string;
  type?: string;
}

export interface Article {
  title: string;
  publication: string;
  date: string;
}

export interface Project {
  name: string;
  url: string;
  description: string;
}

export type HighlightSemanticMap = Record<string, HighlightSemanticItem>;

export interface HighlightSemanticItem {
  text?: string;
  use?: string[];
  experienceYears?: number;
  certifications?: string[];
  className?: 'strong' | 'soft';
}
