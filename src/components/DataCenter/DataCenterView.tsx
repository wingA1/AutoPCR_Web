import { useEffect, useState } from 'react';
import { Box, Flex, Text, SimpleGrid, Card, Badge, Stack, Tabs, Button } from '@chakra-ui/react';
import { getDCOverview, getDCAccountModules, getDCDailyResult, getAccountDailyResultList, postDCSummary, postDCClean } from '@api/DataCenter';
import type { DCOverview } from '@api/DataCenter';
import { toaster } from '../../components/ui/toaster';
import { Tooltip } from '../../components/ui/tooltip';

const SM: Record<string, string> = {'成功':'done','警告':'partial','错误':'failed','致命':'failed','跳过':'skipped','中止':'partial'};
const SL: Record<string, string> = {done:'已完成',partial:'部分完成',pending:'未执行',running:'执行中',failed:'失败',skipped:'已跳过',not_open:'未开启'};
const SC: Record<string, string> = {done:'green',partial:'yellow',pending:'yellow',running:'blue',failed:'red',skipped:'gray',not_open:'gray'};
function ms(r: string) { return SM[r] || 'pending'; }
function fn(n: number): string { if(!n) return '0'; if(n>=100000000) return (n/100000000).toFixed(1)+'亿'; if(n>=10000) return (n/10000).toFixed(1)+'万'; return n.toLocaleString(); }

interface Props { selectedAccounts: string[]; defaultAccount: string; }

export default function DataCenterView({ selectedAccounts, defaultAccount }: Props) {
    const [ov, setOv] = useState<DCOverview | null>(null);
    const [mod, setMod] = useState<any>(null);
    const [lr, setLr] = useState<any>(null);
    const [ld, setLd] = useState(false);
    const [tab, setTab] = useState('overview');
    const [sums, setSums] = useState<any[]>([]);
    const act = selectedAccounts.length > 0 ? selectedAccounts : (defaultAccount ? [defaultAccount] : []);

    useEffect(() => { if(!act.length) return; if(act.length>1) { ls(); return; } load(act[0]); }, [selectedAccounts, defaultAccount]);

    async function load(alias: string) {
        setLd(true); setSums([]);
        try {
            const m = await getDCAccountModules(alias, 'daily').catch(() => null); setMod(m);
            const rl = await getAccountDailyResultList(alias).catch(() => []);
            if (Array.isArray(rl) && rl.length > 0) { const d = await getDCDailyResult(alias, rl[0].key).catch(() => null); setLr(d); } else { setLr(null); }
            const o = await getDCOverview(alias).catch(() => null); setOv(o);
        } catch {}
        setLd(false);
    }
    async function ls() {
        setLd(true);
        try { const d = await postDCSummary(act); setSums(d || []); setOv(null); setMod(null); setLr(null); } catch {}
        setLd(false);
    }
    async function hc() {
        if (!act.length) return;
        try { await postDCClean(act); toaster.create({ title: '已触发清理', type: 'success' }); act.length === 1 ? load(act[0]) : ls(); } catch {}
    }

    if (!act.length) return <Flex h="full" align="center" justify="center"><Text color="fg.muted" fontSize="lg">请在左侧选择账号</Text></Flex>;
    if (ld) return <Flex h="full" align="center" justify="center"><Text color="fg.muted">加载中...</Text></Flex>;

    if (sums.length > 0) return (
        <Box>
            <Flex justify="space-between" align="center" mb={4}>
                <Text fontSize="lg" fontWeight="bold">多账号汇总 ({sums.length})</Text>
                <Tooltip content={!act.length ? '请先选择账号' : undefined}><Button size="sm" colorPalette="blue" onClick={hc} disabled={!act.length}>批量清理</Button></Tooltip>
            </Flex>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>{sums.map((s: any) => (
                <Card.Root key={s.alias} size="sm"><Card.Body><Flex justify="space-between" align="center" mb={2}><Text fontWeight="bold">{s.alias}</Text>
                    <Badge colorPalette={SC[ms(s.daily_clean_status)] || 'gray'}>{SL[ms(s.daily_clean_status)] || '未知'}</Badge></Flex>
                    <Text fontSize="sm" color="fg.muted">清日常时间: {s.daily_clean_time || '暂无'}</Text></Card.Body></Card.Root>
            ))}</SimpleGrid>
        </Box>
    );

    const sl = bsl(mod, lr);
    return (
        <Box>
            {/* Top Bar: Tabs + Button */}
            <Flex justify="space-between" align="center" mb={4}>
                <Tabs.Root value={tab} onValueChange={e => setTab(e.value)}>
                    <Tabs.List>
                        <Tabs.Trigger value="overview">总览</Tabs.Trigger>
                        <Tabs.Trigger value="status">任务状态</Tabs.Trigger>
                        <Tabs.Trigger value="alerts">异常预警</Tabs.Trigger>
                    </Tabs.List>
                </Tabs.Root>
                <Tooltip content={!act.length ? '请先选择账号' : undefined}>
                    <Button size="sm" colorPalette="blue" onClick={hc} disabled={!act.length}>执行清理</Button>
                </Tooltip>
            </Flex>

            {/* Overview Cards Grid */}
            {tab === 'overview' && ov && (
                <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))" gap="14px">
                    <SCard l="昵称" v={ov.nickname || ov.alias} />
                    <SCard l="体力" v={`${ov.stamina}/${ov.stamina_max}`} />
                    <SCard l="等级" v={String(ov.level)} />
                    <SCard l="钻石" v={fn(ov.jewel)} />
                    <SCard l="玛那" v={fn(ov.mana)} />
                    <SCard l="扫荡券" v={fn(ov.sweep_ticket)} />
                    <SCard l="母猪石" v={String(ov.goddess_stone)} />
                    <SCard l="全角色战力" v={fn(ov.total_power)} />
                    <SCard l="已氪体数" v={String(ov.recover_stamina_count)} />
                    <SCard l="数据时间" v={ov.daily_clean_time || '暂无同步数据'} />
                    <SCard l="清日常时间" v={ov.daily_clean_time || '暂无同步数据'} />
                </Box>
            )}

            {tab === 'status' && <SLst items={sl} />}

            {tab === 'alerts' && <ALst items={sl} />}
        </Box>
    );
}

function bsl(mod: any, lr: any) {
    if (!mod) return [];
    const o: string[] = mod.order || []; const inf = mod.info || {}; const cfg = mod.config || {}; const rd = lr?.result || {};
    return o.map((k: string) => { const m = inf[k] || {}; const en = !!cfg[k]; const mr = rd[k]; const rs = mr?.status || (en ? 'pending' : '跳过');
        return { name: m.name || k, key: k, status: ms(rs), status_text: SL[ms(rs)] || '未知', enabled: en, detail: typeof mr?.log === 'string' ? mr.log.slice(0, 200) : '', last_time: lr?.time || '' };
    });
}
function SCard({ l, v }: { l: string; v: string }) {
    return (
        <Box bg="bg.panel" borderRadius="lg" borderWidth="1px" borderColor="border.subtle" p={4} h="130px" display="flex" flexDirection="column" justifyContent="space-between">
            <Text fontSize="xs" color="fg.muted" fontWeight="medium">{l}</Text>
            <Text fontSize="2xl" fontWeight="bold" lineHeight="short" noOfLines={1}>{v}</Text>
        </Box>
    );
}
function SLst({ items }: { items: any[] }) {
    if (!items.length) return <Text color="fg.muted">暂无任务状态</Text>;
    return <Stack gap={2}>{items.map((it: any) => <Flex key={it.key} p={3} bg="bg.subtle" borderRadius="md" align="center" gap={3}>
        <Badge colorPalette={SC[it.status]||'gray'} minW="60px" textAlign="center">{it.status_text}</Badge>
        <Text fontWeight="medium" flex={1}>{it.name}</Text>{it.last_time && <Text fontSize="xs" color="fg.muted">{it.last_time}</Text>}</Flex>)}</Stack>;
}
function ALst({ items }: { items: any[] }) {
    const f = items.filter((i: any) => i.status==='failed'); const p = items.filter((i: any) => i.status==='partial');
    if (!f.length && !p.length) return <Box p={4} bg="bg.subtle" borderRadius="md"><Text color="green.500">暂无异常</Text></Box>;
    return <Stack gap={2}>{f.map((it: any) => <Box key={it.key} p={3} borderLeft="4px solid" borderColor="red.400" bg="red.50" borderRadius="md" _dark={{bg:'red.900'}}><Text fontWeight="bold" color="red.500">[失败] {it.name}</Text><Text fontSize="sm" color="fg.muted">{it.detail||'请检查执行日志'}</Text></Box>)}
    {p.map((it: any) => <Box key={it.key} p={3} borderLeft="4px solid" borderColor="yellow.400" bg="yellow.50" borderRadius="md" _dark={{bg:'yellow.900'}}><Text fontWeight="bold" color="yellow.600">[警告] {it.name}</Text><Text fontSize="sm" color="fg.muted">{it.detail||'部分完成'}</Text></Box>)}</Stack>;
}
