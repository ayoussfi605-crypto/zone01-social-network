/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CirclePlus,
  Lock,
  MessageCircle,
  Send,
  Smile,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { groupService } from "@/src/services/groupService";
import { profileService } from "@/src/services/profileService";
import { useWebSocket } from "@/src/context/WebSocketConetext";
import type {
  GroupChatMessage,
  GroupDiscovery,
  GroupEvent,
  GroupJoinRequest,
  GroupMember,
  GroupPost,
} from "@/src/types/group";
import type { User } from "@/src/types/user";

type GroupTab = "posts" | "events" | "members" | "chat";

const tabs: { id: GroupTab; label: string; Icon: typeof MessageCircle }[] = [
  { id: "posts", label: "Posts", Icon: MessageCircle },
  { id: "events", label: "Events", Icon: CalendarDays },
  { id: "members", label: "Members", Icon: Users },
  { id: "chat", label: "Chat", Icon: Send },
];

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? "?"}${lastName[0] ?? ""}`.toUpperCase();
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { sendMessage, receiveMessage, conected } = useWebSocket();
  const groupID = Number(params.id);

  const [group, setGroup] = useState<GroupDiscovery | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupChatMessage[]>([]);
  const [groupMessageDraft, setGroupMessageDraft] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<GroupTab>("posts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [postDraft, setPostDraft] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>(
    {},
  );
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [candidates, setCandidates] = useState<GroupMember[]>([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [candidatesLoaded, setCandidatesLoaded] = useState(false);
  const [busy, setBusy] = useState("");

  const isMember = group?.membership_status === "member";

  useEffect(() => {
    let active = true;
    async function loadGroup() {
      if (!Number.isInteger(groupID) || groupID <= 0) {
        setError("Invalid group address");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const availableGroups = await groupService.browseGroups();
        const currentGroup = availableGroups.find(
          (item) => item.id === groupID,
        );
        if (!currentGroup) {
          throw new Error("Group not found");
        }
        if (!active) return;
        setGroup(currentGroup);

        if (currentGroup.membership_status !== "member") {
          setMembers([]);
          setJoinRequests([]);
          setPosts([]);
          setEvents([]);
          setGroupMessages([]);
          return;
        }

        const [
          currentMembers,
          currentPosts,
          currentEvents,
          requests,
          messages,
          user,
        ] = await Promise.all([
          groupService.getMembers(groupID),
          groupService.getPosts(groupID),
          groupService.getEvents(groupID),
          currentGroup.is_creator
            ? groupService.getJoinRequests(groupID)
            : Promise.resolve([]),
          groupService.getGroupMessages(groupID),
          profileService.getCurrentUser(),
        ]);
        if (!active) return;
        setMembers(currentMembers);
        setPosts(currentPosts);
        setEvents(currentEvents);
        setJoinRequests(requests);
        setGroupMessages(messages);
        setCurrentUser(user);
      } catch (reason: unknown) {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "Could not load group",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadGroup();
    return () => {
      active = false;
    };
  }, [groupID, refreshKey]);

  useEffect(() => {
    if (!isMember || activeTab !== "members" || candidatesLoaded || loading) {
      return;
    }
    let active = true;
    async function loadCandidates() {
      try {
        const result = await groupService.getInviteCandidates(groupID);
        if (!active) return;
        setCandidates(result);
        setCandidatesLoaded(true);
      } catch (reason: unknown) {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load invite candidates",
          );
      }
    }
    void loadCandidates();
    return () => {
      active = false;
    };
  }, [activeTab, candidatesLoaded, groupID, isMember, loading]);

  useEffect(
    () =>
      receiveMessage((event) => {
        if (
          event.type !== "message_group" ||
          !("group_id" in event) ||
          Number(event.group_id) !== groupID ||
          !("message" in event) ||
          !("sender_id" in event)
        ) {
          return;
        }
        setGroupMessages((current) => [
          ...current,
          {
            type: "message_group",
            group_id: groupID,
            sender_id: Number(event.sender_id),
            sender_name: event.sender_name ?? "Group member",
            message: event.message,
            timestamp: event.timestamp ?? new Date().toISOString(),
          },
        ]);
      }),
    [groupID, receiveMessage],
  );

  const visibleCandidates = useMemo(() => {
    const normalized = candidateSearch.trim().toLowerCase();
    if (!normalized) return candidates;
    return candidates.filter((candidate) =>
      `${candidate.first_name} ${candidate.last_name}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [candidateSearch, candidates]);

  async function requestAccess() {
    setBusy("join");
    setError("");
    try {
      await groupService.requestToJoin(groupID);
      setGroup((current) =>
        current
          ? { ...current, membership_status: "pending_request" }
          : current,
      );
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : "Could not request to join",
      );
    } finally {
      setBusy("");
    }
  }

  async function respondToInvite(accept: boolean) {
    setBusy("invite-response");
    setError("");
    try {
      await groupService.respondToInvite(groupID, accept);
      if (accept) {
        setActiveTab("posts");
        setRefreshKey((current) => current + 1);
      } else {
        router.push("/groups");
      }
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not respond to invitation",
      );
    } finally {
      setBusy("");
    }
  }

  async function inviteSelectedUsers() {
    if (selectedCandidates.length === 0) return;
    setBusy("send-invites");
    setError("");
    try {
      await groupService.inviteMembers(groupID, selectedCandidates);
      setCandidates((current) =>
        current.filter(
          (candidate) => !selectedCandidates.includes(candidate.id),
        ),
      );
      setSelectedCandidates([]);
      setCandidatesLoaded(false);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : "Could not send invitations",
      );
    } finally {
      setBusy("");
    }
  }

  async function respondToJoinRequest(userID: number, accept: boolean) {
    setBusy(`request-${userID}`);
    setError("");
    try {
      await groupService.respondToJoinRequest(groupID, userID, accept);
      setJoinRequests((current) =>
        current.filter((request) => request.user_id !== userID),
      );
      if (accept) setRefreshKey((current) => current + 1);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not respond to join request",
      );
    } finally {
      setBusy("");
    }
  }

  async function createPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!postDraft.trim()) return;
    setBusy("post");
    setError("");
    try {
      const post = await groupService.createPost(groupID, postDraft.trim());
      setPosts((current) => [post, ...current]);
      setPostDraft("");
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : "Could not create post",
      );
    } finally {
      setBusy("");
    }
  }

  async function createComment(postID: number) {
    const content = commentDrafts[postID]?.trim();
    if (!content) return;
    setBusy(`comment-${postID}`);
    setError("");
    try {
      const comment = await groupService.createComment(
        groupID,
        postID,
        content,
      );
      setPosts((current) =>
        current.map((post) =>
          post.id === postID
            ? { ...post, comments: [...post.comments, comment] }
            : post,
        ),
      );
      setCommentDrafts((current) => ({ ...current, [postID]: "" }));
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : "Could not add comment",
      );
    } finally {
      setBusy("");
    }
  }

  async function createEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eventTitle.trim() || !eventTime) return;
    setBusy("event");
    setError("");
    try {
      const created = await groupService.createEvent(groupID, {
        title: eventTitle.trim(),
        description: eventDescription.trim(),
        event_time: new Date(eventTime).toISOString(),
      });
      setEvents((current) =>
        [...current, created].sort(
          (first, second) =>
            Date.parse(first.event_time) - Date.parse(second.event_time),
        ),
      );
      setEventTitle("");
      setEventDescription("");
      setEventTime("");
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : "Could not create event",
      );
    } finally {
      setBusy("");
    }
  }

  async function respondToEvent(
    eventID: number,
    response: "going" | "not_going",
  ) {
    setBusy(`event-${eventID}`);
    setError("");
    try {
      await groupService.respondToEvent(groupID, eventID, response);
      const updatedEvents = await groupService.getEvents(groupID);
      setEvents(updatedEvents);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not save event response",
      );
    } finally {
      setBusy("");
    }
  }

  function sendGroupMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = groupMessageDraft.trim();
    if (!message || !currentUser || !conected) return;
    sendMessage(
      JSON.stringify({
        type: "message_group",
        group_id: groupID,
        message,
        sender_name: `${currentUser.first_name} ${currentUser.last_name}`,
      }),
    );
    setGroupMessageDraft("");
    setShowEmojiPicker(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-4 py-12 text-center text-sm text-[#6B7280]">
        Loading group…
      </main>
    );
  }

  if (!group) {
    return (
      <main className="min-h-screen bg-white px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6">
          <p role="alert" className="text-sm text-[#262626]">
            {error || "Group not found"}
          </p>
          <Link
            href="/groups"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold"
          >
            <ArrowLeft size={16} /> Browse groups
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-24 text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white"></header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {error && (
          <p
            role="alert"
            className="mb-5 rounded-xl bg-[#F3F4F6] p-3 text-sm text-[#262626]"
          >
            {error}
          </p>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C2DCFB] px-3 py-1 text-xs font-bold text-[#111827]">
              <Users size={13} /> {group.member_count}{" "}
              {group.member_count === 1 ? "member" : "members"}
            </span>
            {isMember && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-3 py-1 text-xs font-bold text-[#262626]">
                {group.is_creator ? "You are the creator" : "You are a member"}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-[#6B7280]">
              <Lock size={12} /> Members only
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-bold">{group.title}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#262626]">
            {group.description}
          </p>

          {group.membership_status === "none" && (
            <button
              type="button"
              disabled={busy === "join"}
              onClick={() => void requestAccess()}
              className="mt-5 rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
            >
              {busy === "join" ? "Sending request…" : "Request to join"}
            </button>
          )}
          {group.membership_status === "pending_request" && (
            <p className="mt-5 inline-flex rounded-xl bg-[#E5E7EB] px-4 py-2.5 text-sm font-bold text-[#262626]">
              Your request is pending creator approval
            </p>
          )}
          {group.membership_status === "pending_invite" && (
            <div className="mt-5">
              <p className="text-sm text-[#262626]">
                You have been invited to this group.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === "invite-response"}
                  onClick={() => void respondToInvite(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                >
                  <Check size={15} /> Accept invitation
                </button>
                <button
                  type="button"
                  disabled={busy === "invite-response"}
                  onClick={() => void respondToInvite(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-[#262626]"
                >
                  <X size={15} /> Decline
                </button>
              </div>
            </div>
          )}
        </section>

        {!isMember ? (
          <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-6 text-sm leading-6 text-[#6B7280]">
            Posts, comments, events and group chat are only visible to members.
            Request access or accept an invitation to join the conversation.
          </section>
        ) : (
          <>
            <nav
              aria-label="Group sections"
              className="mt-5 grid grid-cols-4 gap-1 rounded-2xl border border-zinc-200 bg-white p-1"
            >
              {tabs.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-current={activeTab === id ? "page" : undefined}
                  onClick={() => setActiveTab(id)}
                  className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-xs font-bold sm:text-sm ${
                    activeTab === id
                      ? "bg-black text-white"
                      : "text-[#6B7280] hover:bg-[#F3F4F6]"
                  }`}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
            </nav>

            {activeTab === "posts" && (
              <div className="mt-5 space-y-5">
                <section className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <h2 className="font-bold">Share with the group</h2>
                  <form
                    onSubmit={(event) => void createPost(event)}
                    className="mt-3 space-y-3"
                  >
                    <textarea
                      required
                      maxLength={5000}
                      rows={3}
                      value={postDraft}
                      onChange={(event) => setPostDraft(event.target.value)}
                      placeholder="Write a post for group members…"
                      className="w-full resize-y rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-black"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-[#6B7280]">
                        Visible to members only.
                      </p>
                      <button
                        type="submit"
                        disabled={busy === "post" || !postDraft.trim()}
                        className="rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                      >
                        {busy === "post" ? "Posting…" : "Post"}
                      </button>
                    </div>
                  </form>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-bold">Group posts</h2>
                    <span className="text-sm text-[#6B7280]">
                      {posts.length}
                    </span>
                  </div>
                  {posts.length === 0 ? (
                    <p className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-[#6B7280]">
                      No posts yet. Start the conversation.
                    </p>
                  ) : (
                    <ul className="space-y-4">
                      {posts.map((post) => (
                        <li
                          key={post.id}
                          className="rounded-2xl border border-zinc-200 bg-white p-5"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#C2DCFB] text-xs font-bold text-[#111827]">
                              {post.author_avatar ? (
                                <img
                                  src={profileService.avatarURL(
                                    post.author_avatar,
                                  )}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                initials(
                                  post.author_name.split(" ")[0] ?? "",
                                  post.author_name
                                    .split(" ")
                                    .slice(1)
                                    .join(" "),
                                )
                              )}
                            </span>
                            <div>
                              <p className="text-sm font-semibold">
                                {post.author_name}
                              </p>
                              <p className="text-xs text-[#6B7280]">
                                {formatDate(post.created_at)}
                              </p>
                            </div>
                          </div>
                          <p className="mt-4 whitespace-pre-wrap wrap-break-word text-sm leading-6 text-[#262626]">
                            {post.content}
                          </p>

                          <div className="mt-5 border-t border-zinc-200 pt-4">
                            <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-[#6B7280]">
                              <MessageCircle size={14} /> {post.comments.length}{" "}
                              {post.comments.length === 1
                                ? "comment"
                                : "comments"}
                            </p>
                            <ul className="space-y-3">
                              {post.comments.map((comment) => (
                                <li
                                  key={comment.id}
                                  className="rounded-xl bg-[#F3F4F6] px-3 py-2.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold">
                                      {comment.author_name}
                                    </span>
                                    <span className="text-[11px] text-[#6B7280]">
                                      {formatDate(comment.created_at)}
                                    </span>
                                  </div>
                                  <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm text-[#262626]">
                                    {comment.content}
                                  </p>
                                </li>
                              ))}
                            </ul>
                            <form
                              onSubmit={(event) => {
                                event.preventDefault();
                                void createComment(post.id);
                              }}
                              className="mt-3 flex gap-2"
                            >
                              <input
                                value={commentDrafts[post.id] ?? ""}
                                onChange={(event) =>
                                  setCommentDrafts((current) => ({
                                    ...current,
                                    [post.id]: event.target.value,
                                  }))
                                }
                                placeholder="Write a comment"
                                maxLength={2000}
                                className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-black"
                              />
                              <button
                                type="submit"
                                disabled={
                                  busy === `comment-${post.id}` ||
                                  !commentDrafts[post.id]?.trim()
                                }
                                className="rounded-xl bg-black px-3.5 py-2 text-sm font-bold text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                              >
                                Comment
                              </button>
                            </form>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}

            {activeTab === "events" && (
              <div className="mt-5 space-y-5">
                <section className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <div className="mb-4 inline-flex items-center gap-2">
                    <CalendarDays size={18} />
                    <h2 className="font-bold">Create an event</h2>
                  </div>
                  <form
                    onSubmit={(event) => void createEvent(event)}
                    className="space-y-3"
                  >
                    <input
                      required
                      maxLength={120}
                      value={eventTitle}
                      onChange={(event) => setEventTitle(event.target.value)}
                      placeholder="Event title"
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-black"
                    />
                    <textarea
                      required
                      maxLength={2000}
                      rows={2}
                      value={eventDescription}
                      onChange={(event) =>
                        setEventDescription(event.target.value)
                      }
                      placeholder="Description"
                      className="w-full resize-y rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-black"
                    />
                    <label className="block text-xs font-semibold text-[#6B7280]">
                      Day / time
                      <input
                        required
                        type="datetime-local"
                        value={eventTime}
                        onChange={(event) => setEventTime(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-[#262626] outline-none focus:border-black"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={
                        busy === "event" || !eventTitle.trim() || !eventTime
                      }
                      className="w-full rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                    >
                      <CirclePlus size={15} className="mr-1 inline" />
                      {busy === "event" ? "Creating…" : "Create event"}
                    </button>
                  </form>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-bold">Upcoming events</h2>
                    <span className="text-sm text-[#6B7280]">
                      {events.length}
                    </span>
                  </div>
                  {events.length === 0 ? (
                    <p className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-[#6B7280]">
                      No events scheduled yet.
                    </p>
                  ) : (
                    <ul className="space-y-4">
                      {events.map((event) => (
                        <li
                          key={event.id}
                          className="rounded-2xl border border-zinc-200 bg-white p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <h3 className="text-base font-bold">
                              {event.title}
                            </h3>
                            <span className="rounded-full bg-[#C2DCFB] px-3 py-1 text-xs font-bold text-[#111827]">
                              {formatDate(event.event_time)}
                            </span>
                          </div>
                          {event.description && (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#262626]">
                              {event.description}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-[#6B7280]">
                            Created by {event.creator_name}
                          </p>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={busy === `event-${event.id}`}
                              onClick={() =>
                                void respondToEvent(event.id, "going")
                              }
                              className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${
                                event.my_response === "going"
                                  ? "border-black bg-[#C2DCFB] text-[#111827]"
                                  : "border-zinc-200 bg-white text-[#262626]"
                              }`}
                            >
                              Going · {event.going_count}
                            </button>
                            <button
                              type="button"
                              disabled={busy === `event-${event.id}`}
                              onClick={() =>
                                void respondToEvent(event.id, "not_going")
                              }
                              className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${
                                event.my_response === "not_going"
                                  ? "border-black bg-[#C2DCFB] text-[#111827]"
                                  : "border-zinc-200 bg-white text-[#262626]"
                              }`}
                            >
                              Not going · {event.not_going_count}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}

            {activeTab === "members" && (
              <div className="mt-5 space-y-5">
                <section className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-bold">Members</h2>
                    <span className="text-xs text-[#6B7280]">
                      {members.length}
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {members.map((member) => (
                      <li key={member.id} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#C2DCFB] text-xs font-bold text-[#111827]">
                          {member.avatar_path ? (
                            <img
                              src={profileService.avatarURL(member.avatar_path)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            initials(member.first_name, member.last_name)
                          )}
                        </span>
                        <span className="text-sm font-medium">
                          {member.first_name} {member.last_name}
                        </span>
                        {member.id === group.creator_id && (
                          <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">
                            Creator
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <button
                    type="button"
                    aria-expanded={showInvitePanel}
                    onClick={() => setShowInvitePanel((current) => !current)}
                    className="flex w-full items-center justify-between"
                  >
                    <span className="inline-flex items-center gap-2 font-bold">
                      <UserPlus size={17} /> Invite people
                    </span>
                    <span className="text-xs text-[#6B7280]">
                      {showInvitePanel ? "Hide" : "Any member can invite"}
                    </span>
                  </button>

                  {showInvitePanel && (
                    <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4">
                      <input
                        value={candidateSearch}
                        onChange={(event) =>
                          setCandidateSearch(event.target.value)
                        }
                        placeholder="Search people"
                        className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-black"
                      />
                      {!candidatesLoaded ? (
                        <p className="text-xs text-[#6B7280]">
                          Loading people…
                        </p>
                      ) : visibleCandidates.length === 0 ? (
                        <p className="text-xs text-[#6B7280]">
                          No people available to invite.
                        </p>
                      ) : (
                        <ul className="max-h-56 space-y-1 overflow-y-auto">
                          {visibleCandidates.map((candidate) => {
                            const selected = selectedCandidates.includes(
                              candidate.id,
                            );
                            return (
                              <li key={candidate.id}>
                                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1.5 text-sm hover:bg-[#F3F4F6]">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() =>
                                      setSelectedCandidates((current) =>
                                        selected
                                          ? current.filter(
                                              (id) => id !== candidate.id,
                                            )
                                          : [...current, candidate.id],
                                      )
                                    }
                                    className="accent-black"
                                  />
                                  {candidate.first_name} {candidate.last_name}
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      <button
                        type="button"
                        disabled={
                          busy === "send-invites" ||
                          selectedCandidates.length === 0
                        }
                        onClick={() => void inviteSelectedUsers()}
                        className="w-full rounded-xl bg-black px-3 py-2.5 text-sm font-bold text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                      >
                        {busy === "send-invites"
                          ? "Sending…"
                          : `Send ${selectedCandidates.length || ""} invitation${selectedCandidates.length === 1 ? "" : "s"}`}
                      </button>
                      <p className="text-[11px] text-[#6B7280]">
                        Invited people must accept before they join.
                      </p>
                    </div>
                  )}
                </section>

                {group.is_creator && (
                  <section className="rounded-2xl border border-zinc-200 bg-white p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-bold">Join requests</h2>
                      <span className="text-xs text-[#6B7280]">
                        {joinRequests.length}
                      </span>
                    </div>
                    {joinRequests.length === 0 ? (
                      <p className="text-sm text-[#6B7280]">
                        No pending requests. Only you can accept or refuse them.
                      </p>
                    ) : (
                      <ul className="divide-y divide-zinc-200">
                        {joinRequests.map((request) => (
                          <li
                            key={request.user_id}
                            className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#C2DCFB] text-xs font-bold text-[#111827]">
                              {request.avatar_path ? (
                                <img
                                  src={profileService.avatarURL(
                                    request.avatar_path,
                                  )}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                initials(request.first_name, request.last_name)
                              )}
                            </span>
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                              {request.first_name} {request.last_name}
                            </p>
                            <button
                              type="button"
                              disabled={busy === `request-${request.user_id}`}
                              onClick={() =>
                                void respondToJoinRequest(request.user_id, true)
                              }
                              className="inline-flex items-center gap-1 rounded-xl bg-black px-3 py-2 text-xs font-bold text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                            >
                              <Check size={13} /> Accept
                            </button>
                            <button
                              type="button"
                              disabled={busy === `request-${request.user_id}`}
                              onClick={() =>
                                void respondToJoinRequest(
                                  request.user_id,
                                  false,
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-[#262626]"
                            >
                              <X size={13} /> Refuse
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}
              </div>
            )}

            {activeTab === "chat" && (
              <section className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                  <div className="inline-flex items-center gap-2">
                    <MessageCircle size={18} />
                    <div>
                      <h2 className="text-sm font-bold">Group chat</h2>
                      <p className="text-[11px] text-[#6B7280]">Members only</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#6B7280]">
                    <span
                      className={`h-2 w-2 rounded-full ${conected ? "bg-[#4ADE80]" : "bg-[#E5E7EB]"}`}
                    />
                    {conected ? "LIVE" : "CONNECTING"}
                  </span>
                </header>
                <div className="flex max-h-96 min-h-48 flex-col gap-3 overflow-y-auto bg-[#F3F4F6] p-4">
                  {groupMessages.length === 0 ? (
                    <p className="m-auto text-center text-xs text-[#6B7280]">
                      Start the conversation with your group.
                    </p>
                  ) : (
                    groupMessages.map((message, index) => {
                      const ownMessage =
                        Number(message.sender_id) === currentUser?.id;
                      return (
                        <div
                          key={message.id ?? `${message.timestamp}-${index}`}
                          className={`flex flex-col ${ownMessage ? "items-end" : "items-start"}`}
                        >
                          <span className="mb-1 text-[10px] font-semibold text-[#6B7280]">
                            {ownMessage ? "You" : message.sender_name}
                          </span>
                          <p
                            className={`max-w-[85%] whitespace-pre-wrap wrap-break-word rounded-2xl px-3 py-2 text-sm ${
                              ownMessage
                                ? "bg-[#E5E7EB] text-[#262626]"
                                : "bg-[#C2DCFB] text-[#111827]"
                            }`}
                          >
                            {message.message}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
                <form
                  onSubmit={sendGroupMessage}
                  className="relative flex items-center gap-2 border-t border-zinc-200 p-3"
                >
                  {showEmojiPicker && (
                    <div className="absolute bottom-16 left-3 z-10 flex gap-1 rounded-xl border border-zinc-200 bg-white p-2">
                      {["😊", "😂", "❤️", "👏", "✨"].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() =>
                            setGroupMessageDraft((current) => current + emoji)
                          }
                          className="rounded-lg p-1.5 text-lg hover:bg-[#F3F4F6]"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label="Choose emoji"
                    onClick={() => setShowEmojiPicker((current) => !current)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#6B7280]"
                  >
                    <Smile size={18} />
                  </button>
                  <input
                    value={groupMessageDraft}
                    onChange={(event) =>
                      setGroupMessageDraft(event.target.value)
                    }
                    placeholder="Message the group…"
                    className="min-w-0 flex-1 rounded-full bg-[#F3F4F6] px-4 py-2.5 text-sm outline-none placeholder:text-[#6B7280]"
                  />
                  <button
                    type="submit"
                    aria-label="Send group message"
                    disabled={!conected || !groupMessageDraft.trim()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
