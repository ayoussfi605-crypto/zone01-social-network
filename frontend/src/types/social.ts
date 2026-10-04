export type SocialPerson = {
  id: number;
  name: string;
  handle: string;
  avatar: string;
};

export type SocialComment = {
  id: string;
  author: SocialPerson;
  text: string;
  createdAt: string;
};

export type SocialPost = {
  id: string;
  author: SocialPerson;
  caption: string;
  images: string[];
  location: string;
  createdAt: string;
  likes: number;
  liked: boolean;
  comments: SocialComment[];
};
