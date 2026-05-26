import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Box, Button, Flex, HStack, Input, Spacer, Stack, Text, useDisclosure } from '@chakra-ui/react'
import { FiActivity, FiBook, FiCheck, FiCopy, FiGrid, FiKey, FiLayers, FiList, FiSettings, FiTarget, FiUpload, FiUserMinus, FiUserPlus, FiUserX } from 'react-icons/fi'
import { clearAccounts, delAccount, deleteAccount, getAccountDailyResultList, getUserInfo, postAccount, postAccountImport, putUserInfo } from '@api/Account'
import type { UserInfoResponse } from '@interfaces/UserInfo'
import { toaster } from '@/components/ui/toaster'
import { Tooltip } from '@/components/ui/tooltip'
import { IconButton } from '@/components/ui/icon-button'
import Alert from '@/components/alert'
import NiceModal from '@ebay/nice-modal-react'
import ReadmeModal from '@/components/Account/ReadmeModal'
import resetPasswdModal from '@/components/Users/ResetPasswdModal'
import ResultInfoModal from '@/components/Account/ResultInfoModal'
import ConfigSyncModal from '@/components/Account/ConfigSyncModal'
import DataCenterView from '@/components/DataCenter/DataCenterView'
import { postDCClean } from '@/api/DataCenter'
import { AxiosError } from 'axios'

export const Route = createFileRoute('/daily/_sidebar/datacenter/')({ component: DataCenterPage })

export function DataCenterPage() {
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState<UserInfoResponse>()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [alias, setAlias] = useState('')
  const [isListView, setIsListView] = useState(true)
  const createSwitch = useDisclosure()
  const deleteQQConfirm = useDisclosure()
  const clearConfirm = useDisclosure()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getUserInfo().then((res) => {
      setUserInfo(res)
      if (res.default_account) setSelected([res.default_account])
    }).catch(() => undefined)
  }, [])

  const accounts = userInfo?.accounts ?? []
  const filtered = useMemo(
    () => accounts.filter((a) => a.name.toLowerCase().includes(search.toLowerCase())),
    [accounts, search],
  )

  function refresh() {
    getUserInfo().then(setUserInfo).catch(() => undefined)
  }

  function toggle(name: string, multi: boolean) {
    if (multi) {
      setSelected((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])
      return
    }
    setSelected([name])
  }

  function statusColor(status?: string) {
    if (status === '成功') return 'green'
    if (status === '警告') return 'orange'
    return 'gray'
  }

  const showReadme = () => {
    NiceModal.show(ReadmeModal, {})
      .then(() => localStorage.setItem('readme2', 'true'))
      .catch(() => localStorage.setItem('readme2', 'true'))
  }

  const handleResetPassword = () => {
    NiceModal.show(resetPasswdModal, {})
      .then((value) => {
        putUserInfo({ password: value as string })
          .then((res) => toaster.create({ type: 'success', title: '修改密码成功', description: res }))
          .catch((err: AxiosError) => toaster.create({ type: 'error', title: '修改密码失败', description: (err?.response?.data as string) || '网络错误' }))
      })
      .catch(() => undefined)
  }

  const handleDeleteQQ = () => {
    deleteAccount()
      .then((res) => {
        toaster.create({ type: 'success', title: '注销QQ成功', description: res })
        deleteQQConfirm.onClose()
      })
      .catch((err: AxiosError) => toaster.create({ type: 'error', title: '注销QQ失败', description: (err?.response?.data as string) || '网络错误' }))
  }

  const handleClearAccounts = () => {
    clearAccounts()
      .then((res) => {
        toaster.create({ type: 'success', title: '清空账号成功', description: res })
        clearConfirm.onClose()
        setSelected([])
        refresh()
      })
      .catch((err: AxiosError) => toaster.create({ type: 'error', title: '清空账号失败', description: (err?.response?.data as string) || '网络错误' }))
  }

  const handleCreate = () => {
    if (!createSwitch.open) {
      createSwitch.onOpen()
      return
    }
    if (!alias.trim()) {
      toaster.create({ type: 'error', title: '账号名称不能为空' })
      return
    }

    postAccount(alias)
      .then((res) => {
        toaster.create({ type: 'success', title: '创建成功', description: res })
        setAlias('')
        createSwitch.onClose()
        refresh()
      })
      .catch((err: AxiosError) => toaster.create({ type: 'error', title: '创建失败', description: (err?.response?.data as string) || '网络错误' }))
  }

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    postAccountImport(file)
      .then((res) => {
        toaster.create({ type: 'success', title: '导入成功', description: res })
        refresh()
      })
      .catch((err: AxiosError) => toaster.create({ type: 'error', title: '导入失败', description: (err?.response?.data as string) || '网络错误' }))
  }

  const handleCleanAll = async () => {
    const targets = selected.length ? selected : filtered.map((a) => a.name)
    if (!targets.length) {
      toaster.create({ type: 'info', title: '请先选择账号' })
      return
    }
    try {
      await postDCClean(targets)
      toaster.create({ type: 'success', title: `已触发 ${targets.length} 个账号清理` })
      refresh()
    } catch {
      toaster.create({ type: 'error', title: '触发清理失败' })
    }
  }

  const handleDeleteSelected = async () => {
    const targets = selected.length ? selected : filtered.map((a) => a.name)
    if (!targets.length) {
      toaster.create({ type: 'info', title: '请先选择账号' })
      return
    }
    try {
      await Promise.all(targets.map((name) => delAccount(name)))
      toaster.create({ type: 'success', title: '删除账号成功' })
      setSelected([])
      refresh()
    } catch {
      toaster.create({ type: 'error', title: '删除账号失败' })
    }
  }

  const handleSingleClean = async (name: string) => {
    try {
      await postDCClean([name])
      toaster.create({ type: 'success', title: `${name} 清理已触发` })
      refresh()
    } catch {
      toaster.create({ type: 'error', title: `${name} 清理失败` })
    }
  }

  const handleSingleResult = async (name: string) => {
    try {
      const resultInfo = await getAccountDailyResultList(name)
      await NiceModal.show(ResultInfoModal, { alias: name, title: '日常', resultInfo })
    } catch {
      toaster.create({ type: 'error', title: '获取结果失败' })
    }
  }

  return (
    <Box display="grid" gridTemplateColumns="360px minmax(0, 1fr)" gap={4} p={4} h="calc(100vh - 56px - 32px)" overflow="hidden">
      <Box overflowY="auto" overflowX="hidden" display="flex" flexDirection="column" gap={3} minW={0}>
        <Input size="sm" placeholder="搜索账号名称..." value={search} onChange={(e) => setSearch(e.target.value)} borderRadius="full" bg="bg.panel" />

        <Box bg="bg.panel" borderRadius="lg" borderWidth="1px" borderColor="border.subtle" p={3}>
          <Flex justify="space-between" align="center" gap={2}>
            <Text fontSize="lg" fontWeight="bold">欢迎回来, {userInfo?.qq || '...'}</Text>
            <HStack gap={1}>
              <Tooltip content="使用须知"><IconButton aria-label="readme" size="xs" variant="ghost" colorPalette="teal" onClick={showReadme}><FiBook /></IconButton></Tooltip>
              <Tooltip content="修改密码"><IconButton aria-label="reset-pwd" size="xs" variant="ghost" colorPalette="blue" onClick={handleResetPassword}><FiKey /></IconButton></Tooltip>
              <Tooltip content="注销QQ"><IconButton aria-label="delete-qq" size="xs" variant="ghost" colorPalette="red" onClick={deleteQQConfirm.onOpen}><FiUserX /></IconButton></Tooltip>
            </HStack>
          </Flex>
        </Box>

        <Box bg="bg.panel" borderRadius="lg" borderWidth="1px" borderColor="border.subtle" p={2}>
          <Flex align="center" wrap="wrap" gap={1}>
            <Button size="xs" colorPalette="orange" variant="ghost" onClick={handleCleanAll}><FiTarget /> 清理全部</Button>
            <Button size="xs" colorPalette="blue" variant="ghost" onClick={() => toaster.create({ type: 'info', title: '请在账号配置页执行批量运行' })}><FiLayers /> 批量运行</Button>
            <Spacer />
            <Box bg="bg.subtle" p={0.5} borderRadius="md" display="flex" gap={0.5}>
              <Button size="xs" variant={isListView ? 'solid' : 'ghost'} colorPalette={isListView ? 'blue' : 'gray'} minW="64px" h="28px" px={1} onClick={() => setIsListView(true)}><HStack gap={1}><FiList /><Text fontSize="10px">账号列表</Text></HStack></Button>
              <Button size="xs" variant={!isListView ? 'solid' : 'ghost'} colorPalette={!isListView ? 'blue' : 'gray'} minW="64px" h="28px" px={1} onClick={() => setIsListView(false)}><HStack gap={1}><FiGrid /><Text fontSize="10px">账号卡片</Text></HStack></Button>
            </Box>
            <Tooltip content="导入账号"><IconButton aria-label="import" size="xs" variant="outline" colorPalette="teal" onClick={() => fileInputRef.current?.click()}><FiUpload /></IconButton></Tooltip>
            <Input ref={fileInputRef} type="file" accept=".tsv" display="none" onChange={handleImport} />
            <Tooltip content="删除选中"><IconButton aria-label="remove" size="xs" variant="outline" colorPalette="red" onClick={handleDeleteSelected}><FiUserMinus /></IconButton></Tooltip>
            <Tooltip content={createSwitch.open ? '确认创建' : '新增账号'}><IconButton aria-label="add" size="xs" variant="outline" colorPalette="green" onClick={handleCreate}>{createSwitch.open ? <FiCheck /> : <FiUserPlus />}</IconButton></Tooltip>
          </Flex>
          {createSwitch.open && <Input size="xs" mt={2} placeholder="输入账号名称" value={alias} onChange={(e) => setAlias(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />}
        </Box>

        <Stack flex={1} overflowY="auto" gap={2} minH={0}>
          {filtered.map((acc) => (
            <Box key={acc.name} p={3} borderRadius="md" cursor="pointer" bg={selected.includes(acc.name) ? 'blue.subtle' : 'bg.panel'} borderWidth="1px" borderColor={selected.includes(acc.name) ? 'blue.400' : 'border.subtle'} onClick={(e) => toggle(acc.name, e.ctrlKey || e.metaKey)}>
              <Flex justify="space-between" align="center">
                <HStack gap={1}>
                  <Box w={2} h={2} borderRadius="full" bg={statusColor(acc.daily_clean_time?.status) === 'green' ? 'green.400' : statusColor(acc.daily_clean_time?.status) === 'orange' ? 'orange.400' : 'gray.400'} />
                  <Text fontSize={isListView ? 'md' : 'xl'} fontWeight="bold">{acc.name}</Text>
                  {acc.name === userInfo?.default_account && <Badge colorPalette="blue">默认</Badge>}
                </HStack>
                <Badge colorPalette={statusColor(acc.daily_clean_time?.status)}>{acc.daily_clean_time?.status || '未知'}</Badge>
              </Flex>
              <Text fontSize="sm" color="fg.muted" mt={1}>{acc.daily_clean_time?.time || '暂无运行记录'}</Text>
              <HStack mt={2} gap={1}>
                <Tooltip content="配置"><IconButton aria-label="config" size="xs" variant="ghost" colorPalette="blue" onClick={(e) => { e.stopPropagation(); navigate({ to: '/daily/account/$account', params: { account: acc.name } } as any) }}><FiSettings /></IconButton></Tooltip>
                <Tooltip content="清理"><IconButton aria-label="clean" size="xs" variant="ghost" colorPalette="orange" onClick={(e) => { e.stopPropagation(); handleSingleClean(acc.name) }}><FiTarget /></IconButton></Tooltip>
                <Tooltip content="同步"><IconButton aria-label="sync" size="xs" variant="ghost" colorPalette="teal" onClick={(e) => { e.stopPropagation(); NiceModal.show(ConfigSyncModal, { sourceAccount: acc.name }) }}><FiCopy /></IconButton></Tooltip>
                <Tooltip content="结果"><IconButton aria-label="result" size="xs" variant="ghost" colorPalette="green" onClick={(e) => { e.stopPropagation(); handleSingleResult(acc.name) }}><FiActivity /></IconButton></Tooltip>
              </HStack>
            </Box>
          ))}
        </Stack>
      </Box>

      <Box overflowY="auto" overflowX="hidden" bg="bg.panel" borderRadius="lg" borderWidth="1px" borderColor="border.subtle" p={4} minW={0}>
        <DataCenterView selectedAccounts={selected} defaultAccount={userInfo?.default_account || ''} />
      </Box>

      <Alert leastDestructiveRef={cancelRef} isOpen={deleteQQConfirm.open} onClose={deleteQQConfirm.onClose} title="注销QQ" body={`确定注销QQ ${userInfo?.qq || ''} 吗？`} onConfirm={handleDeleteQQ}>{' '}</Alert>
      <Alert leastDestructiveRef={cancelRef} isOpen={clearConfirm.open} onClose={clearConfirm.onClose} title="清空所有账号" body="确认清空所有账号吗？" onConfirm={handleClearAccounts}>{' '}</Alert>
    </Box>
  )
}
