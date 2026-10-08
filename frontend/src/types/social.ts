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
  image?: string;
  createdAt: string;
};

export type PostPrivacy = "public" | "almost_private" | "private";

export type SocialPost = {
  id: string;
  author: SocialPerson;
  caption: string;
  image: string;
  privacy: PostPrivacy;
  audienceIDs: number[];
  createdAt: string;
  likes: number;
  liked: boolean;
  comments: SocialComment[];
};
