import { useEffect, useMemo, useState } from 'react'
import { Badge, Box, Button, Card, Flex, SimpleGrid, Stack, Tabs, Text } from '@chakra-ui/react'
import { getAccountDailyResultList, getDCAccountModules, getDCDailyResult, getDCOverview, postDCSummary } from '@api/DataCenter'
import type { DCOverview } from '@api/DataCenter'
import { toaster } from '@/components/ui/toaster'

type Props = {
  selectedAccounts: string[]
  defaultAccount: string
  onCleanAccounts?: (aliases: string[]) => Promise<void> | void
}

type StatusItem = {
  key: string
  name: string
  status: 'done' | 'partial' | 'pending' | 'running' | 'failed' | 'not_open' | 'skipped'
  statusText: string
  detail: string
  lastTime: string
}

type StatusFilter = 'all' | StatusItem['status']

const statusMap: Record<string, StatusItem['status']> = {
  成功: 'done',
  警告: 'partial',
  错误: 'failed',
  中止: 'failed',
  跳过: 'skipped',
}

const statusLabel: Record<StatusItem['status'], string> = {
  done: '已完成',
  partial: '部分完成',
  pending: '未执行',
  running: '执行中',
  failed: '失败',
  not_open: '未开启',
  skipped: '已跳过',
}

const statusColor: Record<StatusItem['status'], string> = {
  done: 'green',
  partial: 'yellow',
  pending: 'gray',
  running: 'blue',
  failed: 'red',
  not_open: 'gray',
  skipped: 'gray',
}

const statusFilterOrder: StatusFilter[] = ['all', 'done', 'partial', 'pending', 'running', 'failed', 'not_open', 'skipped']

const statusFilterLabel: Record<StatusFilter, string> = {
  all: '全部',
  ...statusLabel,
}

const statusFilterColor: Record<StatusFilter, string> = {
  all: 'blue',
  ...statusColor,
}

function compactNum(n?: number) {
  if (!n) return '0'
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}亿`
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return n.toLocaleString()
}

function parseTalentLevels(value?: string): { name: string; level: string }[] {
  if (!value) return []
  const results: { name: string; level: string }[] = []
  const pattern = /([^\d\s\/\n,;]+)\s*(\d+)\s*(?:->|→|➡)?\s*\d*/g
  let match
  while ((match = pattern.exec(value)) !== null) {
    if (match[1] && match[2]) {
      results.push({ name: match[1].trim(), level: match[2] })
    }
  }
  if (results.length === 0) {
    const parts = value.split(/[\n\/,;]/).map(s => s.trim()).filter(Boolean)
    for (const part of parts) {
      const m = part.match(/^(.*?)(\d+)$/)
      if (m) results.push({ name: m[1].trim(), level: m[2] })
      else if (part) results.push({ name: part, level: '' })
    }
  }
  return results
}

function toStatusItems(mod: any, dailyResult: any): StatusItem[] {
  if (!mod) return []
  const order: string[] = mod.order || []
  const info = mod.info || {}
  const config = mod.config || {}
  const result = dailyResult?.result || {}

  return order.map((k) => {
    const moduleInfo = info[k] || {}
    const moduleResult = result[k]
    const enabled = !!config[k]
    const raw = moduleResult?.status || (enabled ? 'pending' : '跳过')
    const status = statusMap[raw] || (raw as StatusItem['status']) || 'pending'

    return {
      key: k,
      name: moduleInfo.name || k,
      status,
      statusText: statusLabel[status] || '未知',
      detail: typeof moduleResult?.log === 'string' ? moduleResult.log.slice(0, 180) : '',
      lastTime: dailyResult?.time || '',
    }
  })
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card.Root bg="bg.panel" borderWidth="1px" borderColor="border.subtle" borderRadius="lg" minH="118px">
      <Card.Body display="flex" justifyContent="space-between" flexDirection="column" gap={3}>
        <Text fontSize="xs" color="fg.muted">{label}</Text>
        <Text fontSize="2xl" fontWeight="bold" lineHeight="1.25" wordBreak="break-word">{value}</Text>
      </Card.Body>
    </Card.Root>
  )
}

export default function DataCenterView({ selectedAccounts, defaultAccount, onCleanAccounts }: Props) {
  const [tab, setTab] = useState('overview')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [overview, setOverview] = useState<DCOverview | null>(null)
  const [moduleDef, setModuleDef] = useState<any>(null)
  const [dailyResult, setDailyResult] = useState<any>(null)
  const [summaryList, setSummaryList] = useState<any[]>([])

  const active = useMemo(() => {
    if (selectedAccounts.length > 0) return selectedAccounts
    return defaultAccount ? [defaultAccount] : []
  }, [selectedAccounts, defaultAccount])

  useEffect(() => {
    if (!active.length) return
    if (active.length > 1) {
      loadSummary(active)
    } else {
      loadSingle(active[0])
    }
  }, [active.join('|')])

  async function loadSingle(alias: string) {
    setLoading(true)
    setSummaryList([])
    try {
      const [ov, mod, rl] = await Promise.all([
        getDCOverview(alias).catch(() => null),
        getDCAccountModules(alias, 'daily').catch(() => null),
        getAccountDailyResultList(alias).catch(() => []),
      ])
      setOverview(ov)
      setModuleDef(mod)

      const latestKey = Array.isArray(rl) && rl.length > 0 ? (rl[0] as any)?.key : null
      if (latestKey) {
        const dr = await getDCDailyResult(alias, latestKey).catch(() => null)
        setDailyResult(dr)
      } else {
        setDailyResult(null)
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadSummary(aliases: string[]) {
    setLoading(true)
    setOverview(null)
    setModuleDef(null)
    setDailyResult(null)
    try {
      const list = await postDCSummary(aliases).catch(() => [])
      setSummaryList(list || [])
    } finally {
      setLoading(false)
    }
  }

  async function runClean() {
    if (!active.length || cleaning) return
    setCleaning(true)
    try {
      if (onCleanAccounts) {
        await onCleanAccounts(active)
      }
      if (active.length > 1) await loadSummary(active)
      else await loadSingle(active[0])
    } catch {
      toaster.create({ type: 'error', title: '清理触发失败' })
    } finally {
      setCleaning(false)
    }
  }

  if (!active.length) {
    return <Flex h="full" align="center" justify="center"><Text color="fg.muted">请先在左侧选择账号</Text></Flex>
  }

  if (loading) {
    return <Flex h="full" align="center" justify="center"><Text color="fg.muted">加载中...</Text></Flex>
  }

  if (summaryList.length > 0) {
    return (
      <Box>
        <Flex justify="space-between" align="center" mb={4}>
          <Text fontSize="lg" fontWeight="bold">多账号汇总（{summaryList.length}）</Text>
          <Button size="sm" colorPalette="blue" onClick={runClean} loading={cleaning}>批量清理</Button>
        </Flex>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
          {summaryList.map((s: any) => {
            const st = statusMap[s.daily_clean_status] || 'pending'
            return (
              <Card.Root key={s.alias} bg="bg.panel" borderWidth="1px" borderColor="border.subtle">
                <Card.Body>
                  <Flex justify="space-between" align="center" mb={2}>
                    <Text fontWeight="bold">{s.alias}</Text>
                    <Badge colorPalette={statusColor[st]}>{statusLabel[st]}</Badge>
                  </Flex>
                  <Text fontSize="sm" color="fg.muted">清日常时间：{s.daily_clean_time || '暂无'}</Text>
                </Card.Body>
              </Card.Root>
            )
          })}
        </SimpleGrid>
      </Box>
    )
  }

  const statusItems = toStatusItems(moduleDef, dailyResult)
  const statusCounts = statusItems.reduce<Record<StatusFilter, number>>((acc, item) => {
    acc.all += 1
    acc[item.status] += 1
    return acc
  }, { all: 0, done: 0, partial: 0, pending: 0, running: 0, failed: 0, not_open: 0, skipped: 0 })
  const filteredStatusItems = statusFilter === 'all'
    ? statusItems
    : statusItems.filter((item) => item.status === statusFilter)

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Tabs.Root value={tab} onValueChange={(e) => setTab(e.value)}>
          <Tabs.List>
            <Tabs.Trigger value="overview">总览</Tabs.Trigger>
            <Tabs.Trigger value="status">任务状态</Tabs.Trigger>
            <Tabs.Trigger value="alerts">异常预警</Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
        {overview?.daily_clean_time && (
          <Box
            flex="1"
            maxW="380px"
            px={4}
            py={2}
            bg="bg.subtle"
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="lg"
          >
            <Text fontSize="xs" color="fg.muted">清日常时间</Text>
            <Text fontSize="sm" fontWeight="bold">{overview.daily_clean_time}</Text>
          </Box>
        )}
        <Button size="sm" colorPalette="blue" onClick={runClean} loading={cleaning}>执行清理</Button>
      </Flex>

      {tab === 'overview' && overview && (
        <Stack gap={6}>
          <Box>
            <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wider" mb={3}>基础信息</Text>
            <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(180px, 1fr))" gap={3}>
              <StatCard label="昵称" value={overview.nickname || overview.alias} />
              <StatCard label="等级" value={`${overview.level}`} />
              <StatCard label="体力" value={`${overview.stamina}/${overview.stamina_max}`} />
              <StatCard label="已氪体数" value={`${overview.recover_stamina_count}`} />
            </Box>
          </Box>
          <Box>
            <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wider" mb={3}>资源信息</Text>
            <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(180px, 1fr))" gap={3}>
              <StatCard label="钻石" value={compactNum(overview.jewel)} />
              <StatCard label="玛那" value={compactNum(overview.mana)} />
              <StatCard label="扫荡券" value={compactNum(overview.sweep_ticket)} />
              <StatCard label="母猪石" value={`${overview.goddess_stone}`} />
            </Box>
          </Box>
          <Box>
            <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wider" mb={3}>竞技场与战力</Text>
            <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(180px, 1fr))" gap={3}>
              <StatCard label="JJC币" value={compactNum(overview.arena_coin)} />
              <StatCard label="PJJC币" value={compactNum(overview.grand_arena_coin)} />
              <StatCard label="全角色战力" value={compactNum(overview.total_power)} />
            </Box>
          </Box>
          <Box>
            <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wider" mb={3}>深域等级</Text>
            <Flex gap={2} wrap="wrap">
              {parseTalentLevels(overview.talent_level).length > 0
                ? parseTalentLevels(overview.talent_level).map((item, i) => (
                  <Box key={i} px={3} py={1.5} bg="bg.subtle" borderRadius="full" borderWidth="1px" borderColor="border.subtle">
                    <Text fontSize="sm" fontWeight="medium">{item.name}{item.level ? ` ${item.level}` : ''}</Text>
                  </Box>
                ))
                : <Text fontSize="sm" color="fg.muted">暂无同步数据</Text>
              }
            </Flex>
          </Box>
        </Stack>
      )}

      {tab === 'status' && (
        <Stack gap={2}>
          {statusItems.length === 0 && <Text color="fg.muted">暂无任务状态</Text>}
          {statusItems.length > 0 && (
            <Flex gap={2} wrap="wrap" mb={2}>
              {statusFilterOrder.map((status) => (
                <Button
                  key={status}
                  size="xs"
                  variant={statusFilter === status ? 'solid' : 'outline'}
                  colorPalette={statusFilterColor[status]}
                  borderRadius="full"
                  px={3}
                  onClick={() => setStatusFilter(status)}
                >
                  {statusFilterLabel[status]} {statusCounts[status]}
                </Button>
              ))}
            </Flex>
          )}
          {statusItems.length > 0 && filteredStatusItems.length === 0 && (
            <Box p={4} bg="bg.subtle" borderRadius="md">
              <Text color="fg.muted">当前筛选下暂无任务</Text>
            </Box>
          )}
          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={3}>
            {filteredStatusItems.map((it) => (
              <Card.Root key={it.key} bg="bg.subtle" borderWidth="1px" borderColor="border.subtle" borderRadius="lg" minH="118px">
                <Card.Body display="flex" flexDirection="column" gap={3}>
                  <Flex justify="space-between" align="start" gap={3}>
                    <Badge colorPalette={statusColor[it.status]} variant="subtle" borderRadius="full">{it.statusText}</Badge>
                    {it.lastTime && <Text fontSize="xs" color="fg.muted" textAlign="right">{it.lastTime}</Text>}
                  </Flex>
                  <Text fontSize="md" fontWeight="bold" lineHeight="1.25">{it.name}</Text>
                  {it.detail && <Text fontSize="xs" color="fg.muted" lineClamp={2}>{it.detail}</Text>}
                </Card.Body>
              </Card.Root>
            ))}
          </SimpleGrid>
        </Stack>
      )}

      {tab === 'alerts' && (
        <Stack gap={2}>
          {statusItems.filter((x) => x.status === 'failed' || x.status === 'partial').length === 0 && (
            <Card.Root bg="bg.subtle" borderWidth="1px" borderColor="border.subtle" borderRadius="xl">
              <Card.Body textAlign="center" py={10}>
                <Text fontSize="lg" fontWeight="semibold" color="fg.muted">暂无异常</Text>
                <Text fontSize="sm" color="fg.muted" mt={1}>所有任务运行正常</Text>
              </Card.Body>
            </Card.Root>
          )}
          {statusItems.filter((x) => x.status === 'failed' || x.status === 'partial').map((it) => (
            <Box key={it.key} p={3} borderLeft="4px solid" borderColor={it.status === 'failed' ? 'red.400' : 'yellow.400'} borderRadius="md" bg="bg.subtle">
              <Text fontWeight="bold" color={it.status === 'failed' ? 'red.500' : 'yellow.500'}>
                [{it.status === 'failed' ? '失败' : '警告'}] {it.name}
              </Text>
              <Text fontSize="sm" color="fg.muted">{it.detail || (it.status === 'failed' ? '请检查运行日志' : '部分完成')}</Text>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  )
}

