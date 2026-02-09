import { apiPost, apiDelete } from './client';

export interface RegisterTokenDto {
	token: string;
	deviceInfo?: string;
}

export const notificationsApi = {
	registerToken: (data: RegisterTokenDto): Promise<void> =>
		apiPost<void>('/notifications/register', data),

	unregisterToken: (data: RegisterTokenDto): Promise<void> =>
		apiDelete<void>('/notifications/unregister', { data }),
};
