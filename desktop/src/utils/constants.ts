import { RoleType } from '../types/common.types';

export const ROLES = {
	ADMIN: 'Администратор',
	MANAGER: 'Менеджер',
	WORKER: 'Работник',
} as const;

export function getRoleLabel(role: RoleType): string {
	return ROLES[role] || role;
}

export const PAGINATION_DEFAULT = {
	page: 1,
	limit: 20,
} as const;

export const DATE_FORMATS = {
	DISPLAY: 'dd.MM.yyyy',
	DISPLAY_TIME: 'dd.MM.yyyy HH:mm',
	API: 'yyyy-MM-dd',
	API_DATETIME: "yyyy-MM-dd'T'HH:mm:ss",
} as const;
