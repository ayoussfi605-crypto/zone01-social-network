export type GroupInvite = {
  group_id: number;
  title: string;
  description: string;
  creator_id: number;
  creator_first_name: string;
  creator_last_name: string;
  created_at: string;
};

export type GroupSummary = {
  id: number;
  creator_id: number;
  title: string;
  description: string;
  created_at: string;
};
