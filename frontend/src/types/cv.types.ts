export interface CVData {
  header: Header;
  contact: Contact;
  about: string;
  experience: ExperienceItem[];
  skills: Skills;
  certifications: Certification[];
  conferences: Conference[];
  projects: Project[];
}

export interface Header {
  name: string;
  title: string;
  role: string;
  vision: string;
}

export interface Contact {
  phone: string;
  email: string;
  location: string;
  website: string;
}

export interface ExperienceItem {
  role: string;
  company: string;
  period: string;
  location: string;
  highlights: string[];
}

export interface Skills {
  technical: string[];
  competencies: string[];
}

export interface Certification {
  title: string;
  code: string;
  year: string;
  id: string;
}

export interface Conference {
  title: string;
  event: string;
  location: string;
}

export interface Project {
  name: string;
  url: string;
  description: string;
}
