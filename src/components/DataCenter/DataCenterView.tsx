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



function compactNum(n?: number) {
  if (!n) return '0'
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}亿`
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return n.toLocaleString()
}
function displayValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '--'
  return String(value)
}

function displayRatio(current: unknown, max: unknown): string {
  if (current == null || max == null) return '--'
  return `${current}/${max}`
}

function normalizeCleanStatus(raw: unknown): 'failed' | 'skipped' | 'partial' | 'running' | 'completed' | 'pending' | 'unknown' {
  if (raw === undefined || raw === null || raw === '') return 'unknown'
  const s = String(raw).toLowerCase()
  if (['failed','error','aborted','失败','错误','中止'].includes(s)) return 'failed'
  if (['skipped','skip','跳过','已跳过'].includes(s)) return 'skipped'
  if (['partial','partially_completed','部分完成','警告'].includes(s)) return 'partial'
  if (['running','执行中'].includes(s)) return 'running'
  if (['completed','success','done','完成','已完成','成功'].includes(s)) return 'completed'
  if (['pending','not_run','未执行','未清理'].includes(s)) return 'pending'
  return 'unknown'
}

function hasValidOverview(ov: DCOverview | null): boolean {
  if (!ov) return false
  const numFields = [ov.level, ov.stamina, ov.stamina_max, ov.jewel, ov.mana, ov.sweep_ticket, ov.goddess_stone, ov.arena_coin, ov.grand_arena_coin, ov.total_power]
  return numFields.some(v => v !== undefined && v !== null) || !!ov.talent_level
}

function getCleanStatus(ov: DCOverview | null): string {
  if (!ov) return ''
  return (ov as any).daily_clean_status ?? (ov as any).clean_status ?? (ov as any).status ?? ''
}
function getAccountStatusHint(ov: DCOverview | null, statusItems: StatusItem[]): { type: 'warning' | 'error' | 'info'; text: string } | null {
  const cleanStatus = normalizeCleanStatus(getCleanStatus(ov))
  const valid = hasValidOverview(ov)
  const hasTaskFailed = statusItems.some(s => s.status === 'failed')
  const hasPartial = statusItems.some(s => s.status === 'partial')
  if (cleanStatus === 'failed' && !valid) return { type: 'error', text: '清理失败，请检查账号登录状态、验证码或账号配置后重新执行清理。' }
  if (hasTaskFailed && !valid) return { type: 'error', text: '清理失败，请检查账号登录状态、验证码或账号配置后重新执行清理。' }
  if (cleanStatus === 'failed' && valid) return { type: 'warning', text: '当前账号最近一次清理存在异常，当前展示的数据可能不是最新结果，请查看“任务状态”或“异常预警”。' }
  if (hasTaskFailed && valid) return { type: 'warning', text: '当前账号最近一次清理存在异常，当前展示的数据可能不是最新结果，请查看“任务状态”或“异常预警”。' }
  if (cleanStatus === 'partial' || hasPartial) return { type: 'warning', text: '当前账号部分任务未完成，请查看“任务状态”或“异常预警”。' }
  if (cleanStatus === 'skipped') return { type: 'info', text: '当前账号本次任务已跳过，数据可能不是最新结果。' }
  if (!valid) return { type: 'warning', text: '当前账号尚未完成日常清理，请先点击“执行清理”获取最新数据。' }
  return null
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
    <Card.Root bg="whiteAlpha.100" borderWidth="1px" borderColor="whiteAlpha.100" borderRadius="lg" minH="88px">
      <Card.Body display="flex" justifyContent="space-between" flexDirection="column" gap={1}>
        <Text fontSize="xs" color="fg.muted">{label}</Text>
        <Text fontSize="xl" fontWeight="bold" lineHeight="1.25" wordBreak="break-word">{value}</Text>
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

            
      {(() => {
        const hint = getAccountStatusHint(overview, statusItems)
        if (!hint) return null
        const bgMap: Record<string, string> = { warning: 'orange.subtle', error: 'red.subtle', info: 'blue.subtle' }
        const borderMap: Record<string, string> = { warning: 'orange.muted', error: 'red.muted', info: 'blue.muted' }
        return (
          <Box px={3} py={2} mb={2} bg={bgMap[hint.type]} borderWidth="1px" borderColor={borderMap[hint.type]} borderRadius="lg">
            <Text fontSize="xs">{hint.text}</Text>
          </Box>
        )
      })()}

{tab === 'overview' && overview && (() => {
        const talentLevels = parseTalentLevels(overview.talent_level)
        return (
          <Box display="grid" gridTemplateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={4} alignContent="start">
            <Stack gap={4}>
              <Card.Root bg="bg.muted" borderWidth="1px" borderColor="whiteAlpha.100" borderRadius="lg">
                <Card.Body py={3} px={4}>
                  <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wider" mb={2}>基础信息</Text>
                  <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={3}>
                    <StatCard label="昵称" value={displayValue(overview.nickname || overview.alias)} />
                    <StatCard label="等级" value={displayValue(overview.level)} />
                    <StatCard label="体力" value={displayRatio(overview.stamina, overview.stamina_max)} />
                    <StatCard label="已氪体数" value={displayValue(overview.recover_stamina_count)} />
                  </Box>
                </Card.Body>
              </Card.Root>
              <Card.Root bg="bg.muted" borderWidth="1px" borderColor="whiteAlpha.100" borderRadius="lg">
                <Card.Body py={3} px={4}>
                  <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wider" mb={2}>深域进度</Text>
                  <Flex gap={2} wrap="wrap">
                    {talentLevels.length > 0
                      ? talentLevels.map((item, i) => (
                        <Box key={i} px={2.5} py={0.5} bg="bg.muted" borderRadius="md" borderWidth="1px" borderColor="border.subtle">
                          <Text fontSize="xs" fontWeight="medium">{item.name}{item.level ? ` ${item.level}` : ''}</Text>
                        </Box>
                      ))
                      : <Text fontSize="xs" color="fg.muted">暂无同步数据</Text>
                    }
                  </Flex>
                </Card.Body>
              </Card.Root>
            </Stack>
            <Stack gap={4}>
              <Card.Root bg="bg.muted" borderWidth="1px" borderColor="whiteAlpha.100" borderRadius="lg">
                <Card.Body py={3} px={4}>
                  <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wider" mb={2}>核心资源</Text>
                  <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={3}>
                    <StatCard label="水晶" value={compactNum(overview.jewel)} />
                    <StatCard label="母猪石" value={displayValue(overview.goddess_stone)} />
                    <StatCard label="心碎" value={displayValue(overview.heart_fragment)} />
                  </Box>
                </Card.Body>
              </Card.Root>
              <Card.Root bg="bg.muted" borderWidth="1px" borderColor="whiteAlpha.100" borderRadius="lg">
                <Card.Body py={2} px={4}>
                  <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wider" mb={1}>存量资源</Text>
                  <Stack gap={0.5}>
                    {[
                      { l: '玛那', v: compactNum(overview.mana) },
                      { l: '扫荡券', v: compactNum(overview.sweep_ticket) },
                      { l: 'JJC币', v: compactNum(overview.arena_coin) },
                      { l: 'PJJC币', v: compactNum(overview.grand_arena_coin) },
                      { l: '全角色战力', v: compactNum(overview.total_power) },
                    ].map((item, i) => (
                      <Flex key={i} justify="space-between" align="center" py={0.5}>
                        <Text fontSize="xs" color="fg.muted">{item.l}</Text>
                        <Text fontSize="sm" fontWeight="semibold">{item.v}</Text>
                      </Flex>
                    ))}
                  </Stack>
                </Card.Body>
              </Card.Root>
            </Stack>
          </Box>
        )
      })()}
{tab === 'status' && (
        <Stack gap={2}>
          {statusItems.length === 0 && <Text color="fg.muted">暂无任务状态</Text>}
          {statusItems.length > 0 && (
            <Flex gap={2} wrap="wrap" mb={2}>
              {statusFilterOrder.map((status) => (
                <Button
                  key={status}
                  size="xs"
                  variant={statusFilter === status ? 'solid' : 'ghost'}
                  colorPalette={statusFilter === status ? 'blue' : 'gray'}
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
                <Card.Body display="flex" flexDirection="column" gap={1}>
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

