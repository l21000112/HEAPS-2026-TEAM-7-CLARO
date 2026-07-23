import { api, ApiError } from '@/api/client';

export type UserRole = 'student' | 'teacher';

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
  /** True once the student finished or skipped the first-run tour (server-side). */
  onboardingTourComplete?: boolean;
  onboardingTourCompletedAt?: string;
};

export type InviteRedemption = {
  alreadyRedeemed?: boolean;
  profile: UserProfile;
  invite?: {
    type: 'teacher' | 'classroom';
    roleToAssign: UserRole;
    classroomId?: string;
    classroomName?: string;
    code?: string;
    invitePath?: string;
    status?: string;
    expiresAt?: string;
  };
  classroom?: {
    id: string;
    name: string;
    teacherUid?: string;
  };
};

export async function createUserProfile(input: {
  role?: UserRole | string;
  displayName: string;
  teacherInviteCode?: string;
  inviteCode?: string;
}) {
  // Build POST body without role - the backend determines role from invite codes.
  const body: Record<string, string> = { displayName: input.displayName };
  if (input.inviteCode) body.inviteCode = input.inviteCode;
  if (input.teacherInviteCode) body.teacherInviteCode = input.teacherInviteCode;

  const { data } = await api.post<UserProfile | InviteRedemption>('/users/profile', body);
  return 'profile' in data ? data.profile : data;
}

export async function redeemInvite(code: string, displayName?: string) {
  const { data } = await api.post<InviteRedemption>('/users/invites/redeem', {
    code,
    displayName: displayName?.trim() || undefined,
  });
  return data;
}

export async function getUserProfile() {
  try {
    const { data } = await api.get<UserProfile>('/users/profile');
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function deleteAccount() {
  await api.delete<void>('/users/profile');
}

/** Mark the student onboarding tour complete on the user profile (cross-device). */
export async function completeOnboardingTour() {
  const { data } = await api.patch<UserProfile>('/users/profile/onboarding', {});
  return data;
}

/** Register this device's Expo push token for homework notifications. */
export async function savePushToken(token: string, appLanguage?: string) {
  await api.post<void>('/users/me/push-token', {
    token,
    ...(appLanguage ? { appLanguage } : {}),
  });
}

/** Best-effort revoke of a device push token (e.g. on logout). */
export async function deletePushToken(token: string) {
  await api.delete<void>('/users/me/push-token', { token });
}