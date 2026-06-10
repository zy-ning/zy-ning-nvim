export interface ContactInfo {
  icon: string;
  text: string;
  url?: string;
}

export interface BlogPostIndexItem {
  title: string;
  date: string;
  slug: string;
  tags?: string[];
  language?: 'zh' | 'en';
  originalSlug?: string;
}

export interface Section {
  title: string;
  content: string;
}

export interface OutlineHeading {
  id: string;
  text: string;
  level: number;
  /** Live reference to the rendered heading element, used for scroll + active tracking. */
  el?: HTMLElement;
}

export interface ProfileData {
  name: string;
  contactInfo: ContactInfo[];
  sections: Section[];
}
