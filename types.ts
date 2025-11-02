export interface ContactInfo {
  icon: string;
  text: string;
  url?: string;
}

export interface BlogPostIndexItem {
  title: string;
  date: string;
  slug: string;
}

export interface Section {
  title: string;
  content: string;
}

export interface ProfileData {
  name: string;
  contactInfo: ContactInfo[];
  sections: Section[];
}
