export interface TeamMember {
  name: string;
  credentials?: string;
  title: string;
  photo?: string;
  linkedin?: string;
}

export const teamIntro =
  'Since 1913, our team of seasoned brokers and service representatives has been guiding clients through the best and worst of times with field-tested insurance solutions. We got our start in Texas, but we serve people and businesses across the country.';

export const team: TeamMember[] = [
  { name: 'Scott West', credentials: 'CIC', title: 'Owner', photo: 'scott-west', linkedin: 'https://www.linkedin.com/in/scott-b-west/' },
  { name: 'Laurie Dempsey', title: 'Owner', photo: 'laurie-dempsey', linkedin: 'https://www.linkedin.com/in/laurie-dempsey-9b5b452/' },
  { name: 'Wes Kurtz', credentials: 'CIC', title: 'Chief Executive Officer', photo: 'wes-kurtz', linkedin: 'https://www.linkedin.com/in/wesleykurtz/' },
  { name: 'Lauren Tarkington', title: 'President', photo: 'lauren-tarkington', linkedin: 'https://www.linkedin.com/in/lauren-tarkington-a395388/' },
  { name: 'David Laing', title: 'Owner', photo: 'david-laing' },
  { name: 'Russell Laing', title: 'Owner', photo: 'russell-laing', linkedin: 'https://www.linkedin.com/in/russell-laing-42709223/' },
  { name: 'Jonathan Marshall', title: 'Chief Financial Officer', photo: 'jonathan-marshall' },
  { name: 'Gina Silva', title: 'Owner', photo: 'gina-silva', linkedin: 'https://www.linkedin.com/in/gina-silva-08949b2/' },
  { name: 'Nancy Roberts', credentials: 'CIC', title: 'Sales Associate', photo: 'nancy-roberts', linkedin: 'https://www.linkedin.com/in/nancy-roberts-b657534/' },
  { name: 'Hill Adams', credentials: 'CIC', title: 'Senior Vice President', photo: 'hill-adams', linkedin: 'https://www.linkedin.com/in/hill-adams-6671165/' },
  { name: 'Zach Gingrich', credentials: 'CIC', title: 'Director of Sales + Employee Benefits', photo: 'zach-gingrich', linkedin: 'https://www.linkedin.com/in/zach-gingrich-2324a774/' },
  { name: 'Griselda Reyna', credentials: 'CIC', title: 'Personal Lines Team Leader', photo: 'griselda-reyna', linkedin: 'https://www.linkedin.com/in/griselda-reyna-3a075912b/' },
  { name: 'Olivia Bean', title: 'Human Resources Coordinator', photo: 'olivia-bean', linkedin: 'https://www.linkedin.com/in/olivialhunter/' },
  { name: 'Tom Clark', credentials: 'CIC', title: 'Producer', linkedin: 'https://www.linkedin.com/in/tom-clark-3a63188/' },
];
