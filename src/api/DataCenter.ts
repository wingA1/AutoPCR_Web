import { API } from '@api/APIUtils';
import { getUserInfo, getAccountDailyResultList } from '@api/Account';

export { getUserInfo, getAccountDailyResultList };

export interface DCOverview {
    alias: string; nickname: string; stamina: number; stamina_max: number;
    level: number; jewel: number; mana: number; sweep_ticket: number;
    goddess_stone: number; heart_fragment: number; total_power: number;
    recover_stamina_count: number; daily_clean_time: string; daily_clean_status: string;
}

export interface DCStatusItem {
    name: string; key: string; status: string; status_text: string;
    enabled: boolean; detail: string; last_time: string;
}

export async function getDCOverview(alias: string) {
    const res = await API.get<DCOverview>(`/datacenter/account/${alias}/overview`);
    return res.data;
}

export async function getDCAccountModules(alias: string, key: string) {
    const res = await API.get(`/account/${alias}/${key}`);
    return res.data;
}

export async function getDCDailyResult(alias: string, key: string) {
    const res = await API.get(`/account/${alias}/daily_result/${key}`, { params: { text: 'true' } });
    return res.data;
}

export async function postDCSummary(aliases: string[]) {
    const res = await API.post('/datacenter/accounts/summary', { aliases });
    return res.data;
}

export async function postDCClean(aliases: string[]) {
    const res = await API.post('/datacenter/actions/clean', { aliases });
    return res.data;
}
