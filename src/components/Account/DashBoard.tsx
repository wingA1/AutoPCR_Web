import { AccountInfo as AccountInfoInterface, UserInfoResponse } from '@interfaces/UserInfo';
import {
    Box,
    Button,
    Card,
    Flex,
    HStack,
    Input,
    SimpleGrid,
    Stack,
    Tag,
    Text,
} from '@chakra-ui/react';
import { FiActivity, FiBook, FiCopy, FiKey, FiSettings, FiTarget, FiUpload, FiUserMinus, FiUserPlus, FiUserX } from 'react-icons/fi';
import { Link, useNavigate } from '@tanstack/react-router';
import { Radio, RadioGroup } from '../../components/ui/radio';
import React, { ChangeEvent } from 'react';
import { Skeleton, SkeletonText } from '../../components/ui/skeleton';
import { clearAccounts, deleteAccount, getAccountDailyResultList, getUserInfo, putUserInfo } from '@api/Account';
import { delAccount, postAccount, postAccountAreaDaily, postAccountImport } from '@api/Account';
import { useEffect, useState } from 'react';

import Alert from '../alert';
import { AxiosError } from 'axios';
import { CloseButton } from '../../components/ui/close-button';
import { Route as DashBoardRoute } from '@routes/daily/_sidebar/account/index';
import { IconButton } from '../../components/ui/icon-button';
import { Route as LoginRoute } from '@routes/daily/login';
import NiceModal from '@ebay/nice-modal-react';
import ReadmeModal from './ReadmeModal';
import ResultInfoModal from './ResultInfoModal';
import { Tooltip } from '../../components/ui/tooltip';
import resetPasswdModal from '../Users/ResetPasswdModal';
import { toaster } from '../../components/ui/toaster';
import { useCountHook } from '../count';
import { useDisclosure } from '@chakra-ui/react';
import ConfigSyncModal from './ConfigSyncModal';
import DataCenterView from '../DataCenter/DataCenterView';

const handle: Map<string, (arg0: boolean) => Promise<void> | void> = new Map<string, (arg0: boolean) => Promise<void> | void>();
const NEW_ACCOUNT_CONFIG_KEY = 'autopcr:new-account-config';

function getAccountConfigRoute(alias: string) {
    const base = DashBoardRoute.to.endsWith('/') ? DashBoardRoute.to : `${DashBoardRoute.to}/`;
    return `${base}${encodeURIComponent(alias)}`;
}

function LabeledActionButton({
    label,
    icon,
    colorPalette,
    onClick,
    loading = false,
    variant = 'ghost',
    as,
    to,
}: {
    label: string
    icon: React.ReactNode
    colorPalette: string
    onClick?: () => void
    loading?: boolean
    variant?: 'ghost' | 'outline' | 'solid' | 'surface'
    as?: any
    to?: string
}) {
    return (
        <Tooltip content={label}>
            <Button
                aria-label={label}
                h="48px"
                flex="1"
                px={1}
                size="sm"
                variant={variant}
                colorPalette={colorPalette}
                onClick={onClick}
                loading={loading}
                as={as}
                {...(to ? { to } : {})}
            >
                <Stack gap={0} align="center">
                    <Box fontSize="16px">{icon}</Box>
                    <Text fontSize="11px" fontWeight="semibold" lineHeight="1.1">{label}</Text>
                </Stack>
            </Button>
        </Tooltip>
    );
}

export function DashBoard() {
    const [userInfo, setUserInfo] = useState<UserInfoResponse>();
    const freshAccountInfo = useDisclosure();
    const creatAccountSwitch = useDisclosure();
    const deleteQQConfirm = useDisclosure();
    const clearAccountConfirm = useDisclosure();
    const [alias, setAlias] = useState<string>('');
    const [count, increaseCount, decreaseCount] = useCountHook();
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [creatingAccount, setCreatingAccount] = useState(false);

    // Status colors can remain as functional colors

    const showReadme = () => {
        NiceModal.show(ReadmeModal, {})
            .then(() => {
                localStorage.setItem('readme2', 'true');
            })
            .catch(() => {
                localStorage.setItem('readme2', 'true');
            });
    };

    useEffect(() => {
        const readme = localStorage.getItem('readme2');
        if (!readme) {
            showReadme();
        }
    }, []);

    useEffect(() => {
        handle.clear();
        getUserInfo()
            .then((res) => {
                setUserInfo(res);
                setSelectedAccounts((prev) => (prev.length ? prev : (res.default_account ? [res.default_account] : [])));
            })
            .catch((err: AxiosError) => {
                toaster.create({ type: 'error', title: (err?.response?.data as string) || '网络错误' });
            });
    }, [freshAccountInfo.open]);

    const handleDefaultAccount = (value: string) => {
        setSelectedAccounts(value ? [value] : []);
        putUserInfo({ default_account: value })
            .then((res) => {
                setUserInfo({ ...userInfo, default_account: value });
                toaster.create({ type: 'success', title: '设置默认账号成功', description: res });
            })
            .catch((err: AxiosError) => {
                toaster.create({ type: 'error', title: '设置默认账号失败', description: (err?.response?.data as string) || '网络错误' });
            });
    };

    const handleResetPassword = () => {
        NiceModal.show(resetPasswdModal, {})
            .then((value) => {
                putUserInfo({ password: value as string })
                    .then((res) => {
                        toaster.create({ type: 'success', title: '修改密码成功', description: res });
                        NiceModal.hide(resetPasswdModal)
                            .then(() => {
                                return;
                            })
                            .catch(() => {
                                return;
                            });
                    })
                    .catch((err: AxiosError) => {
                        toaster.create({ type: 'error', title: '修改密码失败', description: (err?.response?.data as string) || '网络错误' });
                    });
            })
            .catch(() => {
                return;
            });
    };

    const updateAccountInfo = (updatedAccount: AccountInfoInterface) => {
        setUserInfo((prevUserInfo) => {
            if (!prevUserInfo?.accounts) {
                return prevUserInfo;
            }

            const updatedAccounts = prevUserInfo.accounts.map((account) => (account.name === updatedAccount.name ? updatedAccount : account));

            return {
                ...prevUserInfo,
                accounts: updatedAccounts,
            };
        });
    };

    const handleCleanDailyAll = () => {
        for (const fn of handle.values()) {
            fn(false);
        }
    };

    const handleCleanDailyByAliases = async (aliases: string[]) => {
        const targets = aliases.length ? aliases : (userInfo?.default_account ? [userInfo.default_account] : []);
        if (!targets.length) {
            toaster.create({ type: 'info', title: '请先选择账号' });
            return;
        }

        let executed = false;
        for (const accountName of targets) {
            const fn = handle.get(accountName);
            if (fn) {
                executed = true;
                await fn(false);
                continue;
            }

            executed = true;
            increaseCount();
            toaster.create({ type: 'info', title: `开始为${accountName}清理日常...` });
            try {
                const res = await postAccountAreaDaily(accountName);
                toaster.create({ type: 'success', title: `${accountName}清日常成功` });
                updateAccountInfo(res);
            } catch (err: any) {
                toaster.create({ type: 'error', title: `${accountName}清日常失败`, description: (err?.response?.data as string) || '网络错误' });
            } finally {
                decreaseCount();
            }
        }

        if (!executed) {
            toaster.create({ type: 'info', title: '对应账号暂未加载，请稍后再试' });
        }
    };

    const handleCreateAccount = async () => {
        if (creatAccountSwitch.open) {
            // 检查alias是否为空
            const newAlias = alias.trim();
            if (!newAlias) {
                toaster.create({
                    type: 'error',
                    title: '创建账号失败',
                    description: '账号昵称不能为空',
                });
                return;
            }

            setCreatingAccount(true);
            try {
                const res = await postAccount(newAlias);
                    toaster.create({
                        type: 'success',
                        title: '创建账号成功',
                        description: res,
                    });
                toaster.create({ type: 'info', title: '跳转配置中...' });
                sessionStorage.setItem(NEW_ACCOUNT_CONFIG_KEY, newAlias);
                setSelectedAccounts([newAlias]);
                creatAccountSwitch.onToggle();
                    setAlias(''); // 重置输入框
                    freshAccountInfo.onToggle();
                await navigate({ to: `${getAccountConfigRoute(newAlias)}?newAccount=1` as any });
            } catch (err: any) {
                    toaster.create({
                        type: 'error',
                        title: '创建账号失败',
                        description: (err?.response?.data as string) || '网络错误',
                    });
            } finally {
                setCreatingAccount(false);
            }
        } else {
            creatAccountSwitch.onToggle();
        }
    };

    const handleAccountImport = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            postAccountImport(file)
                .then((res) => {
                    toaster.create({ type: 'success', title: '导入账号成功', description: res });
                    freshAccountInfo.onToggle();
                })
                .catch((err: AxiosError) => {
                    toaster.create({ type: 'error', title: '导入账号失败', description: (err?.response?.data as string) || '网络错误' });
                });
        }
    };

    const cancelRef = React.useRef<HTMLButtonElement>(null);

    const navigate = useNavigate();

    const handleDeleteAccount = () => {
        deleteAccount()
            .then(async (res) => {
                toaster.create({ type: 'success', title: '删除QQ成功', description: res });
                deleteQQConfirm.onToggle();
                await navigate({ to: LoginRoute.to });
            })
            .catch((err: AxiosError) => {
                toaster.create({ type: 'error', title: '删除QQ失败', description: (err?.response?.data as string) || '网络错误' });
            });
    };

    const handleClearAccounts = () => {
        clearAccounts()
            .then((res) => {
                toaster.create({ type: 'success', title: '清除账号成功', description: res });
                clearAccountConfirm.onToggle();
                freshAccountInfo.onToggle();
            })
            .catch((err: AxiosError) => {
                toaster.create({ type: 'error', title: '清除账号失败', description: (err?.response?.data as string) || '网络错误' });
            });
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    return (
        <Box
            display="grid"
            gridTemplateColumns={{ base: '1fr', xl: '360px minmax(0, 1fr)' }}
            gap={3}
            h="full"
            w="full"
            minH={0}
            position="relative"
            zIndex={1}
        >
        <Stack gap={2} h="full" w="full" minH={0} bg="bg.panel" borderRadius="2xl" borderWidth="1px" borderColor="border.subtle" p={2} overflow="hidden">
                        {/* User Info & Actions */}
                        <Card.Root variant="elevated" bg="bg.muted" shadow="sm" borderRadius="xl" borderWidth="1px" borderColor="border.subtle" flexShrink={0}>
                <Card.Body py={2} px={4}>
                    <Text fontSize="md" fontWeight="bold">
                        {!userInfo ? <Skeleton height="20px" width="100px" /> : `欢迎回来, ${userInfo.qq}`}
                    </Text>
                </Card.Body>
            </Card.Root>

            <Stack gap={2} flexShrink={0}>
                <Text fontSize="xs" color="fg.muted" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider">用户</Text>
                <SimpleGrid columns={2} gap={2}>
                    <LabeledActionButton label="使用须知" icon={<FiBook />} colorPalette="gray" variant="ghost" onClick={showReadme} />
                    <LabeledActionButton label="修改密码" icon={<FiKey />} colorPalette="gray" variant="ghost" onClick={handleResetPassword} />
                </SimpleGrid>
            </Stack>

            <Stack gap={2} flexShrink={0}>
                <Text fontSize="xs" color="fg.muted" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider">账号管理</Text>
                <SimpleGrid columns={2} gap={2}>
                    {userInfo?.clan && (
                        <Box gridColumn="span 2">
                            <LabeledActionButton label="导入账号" icon={<FiUpload />} colorPalette="gray" variant="ghost" onClick={() => fileInputRef.current?.click()} />
                        </Box>
                    )}
                    <LabeledActionButton label="清理全部" icon={<FiTarget />} colorPalette="gray" variant="ghost" onClick={handleCleanDailyAll} loading={count != 0} />
                    <LabeledActionButton label="创建账号" icon={<FiUserPlus />} colorPalette="green" variant="solid" onClick={() => creatAccountSwitch.onToggle()} />
                </SimpleGrid>
            </Stack>

            <Stack gap={2} flexShrink={0}>
                <Text fontSize="xs" color="fg.muted" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider">危险操作</Text>
                <SimpleGrid columns={2} gap={2}>
                    <LabeledActionButton label="删除全部" icon={<FiUserMinus />} colorPalette="red" variant="outline" onClick={clearAccountConfirm.onOpen} />
                    <LabeledActionButton label="注销QQ" icon={<FiUserX />} colorPalette="red" variant="outline" onClick={deleteQQConfirm.onOpen} />
                </SimpleGrid>
            </Stack>

            <Alert leastDestructiveRef={cancelRef} isOpen={deleteQQConfirm.open} onClose={deleteQQConfirm.onClose} title="删除QQ" body={`确定删除QQ${userInfo?.qq}吗？`} onConfirm={handleDeleteAccount}>
                {' '}
            </Alert>
            <Alert leastDestructiveRef={cancelRef} isOpen={clearAccountConfirm.open} onClose={clearAccountConfirm.onClose} title="删除所有账号" body={`确定删除所有账号吗？`} onConfirm={handleClearAccounts}>
                {' '}
            </Alert>

            <Input
                ref={fileInputRef}
                type="file"
                accept=".json,.tsv"
                onChange={handleAccountImport}
                onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                display="none"
            />

            {creatAccountSwitch.open && (
                <Flex
                    bg="bg.muted"
                    p={3}
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="green.subtle"
                    align="center"
                    gap={3}
                >
                    <Input
                        autoFocus
                        size="sm"
                        placeholder="输入游戏账号昵称..."
                        value={alias}
                        onChange={(e) => setAlias(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter') handleCreateAccount() }}
                    />
                    <Button size="sm" colorPalette="green" loading={creatingAccount} onClick={handleCreateAccount} flexShrink={0}>创建</Button>
                </Flex>
            )}

            <RadioGroup
                onValueChange={(e) => {
                    const value = e.value || '';
                    handleDefaultAccount(value);
                    setSelectedAccounts(value ? [value] : []);
                }}
                value={userInfo?.default_account}
                flex={1}
                minH={0}
                overflowY={'auto'}
                p={1}
                css={{
                    '&::-webkit-scrollbar': { width: '4px' },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: '2px' },
                }}
            >
                <Stack>
                    <SimpleGrid gap={3} templateColumns="1fr">
                        {!userInfo ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <Card.Root key={i} bg="bg.panel" borderRadius="2xl" shadow="sm">
                                    <Card.Header><Skeleton height="24px" width="50%" /></Card.Header>
                                    <Card.Body><SkeletonText noOfLines={3} gap={4} /></Card.Body>
                                    <Card.Footer><Skeleton height="32px" width="100%" /></Card.Footer>
                                </Card.Root>
                            ))
                        ) : (
                            userInfo?.accounts?.map((account) => (
                                <AccountInfo
                                    key={account.name}
                                    account={account}
                                    onToggle={freshAccountInfo.onToggle}
                                    increaseCount={increaseCount}
                                    decreaseCount={decreaseCount}
                                    updateAccountInfo={updateAccountInfo}
                                    selected={selectedAccounts.includes(account.name) || userInfo?.default_account === account.name}
                                    onSelect={() => handleDefaultAccount(account.name)}
                                    onOpenSyncConfig={(accountAlias) => {
                                        NiceModal.show(ConfigSyncModal, { sourceAccount: accountAlias });
                                    }}
                                />
                            ))
                        )}
                    </SimpleGrid>
                </Stack>
            </RadioGroup>
        </Stack>

        <Box
            bg="bg.panel"
            borderRadius="2xl"
            borderWidth="1px"
            borderColor="border.subtle"
            boxShadow="sm"
            minW={0}
            minH={0}
            overflow="auto"
            p={4}
        >
            <DataCenterView
                selectedAccounts={selectedAccounts}
                defaultAccount={userInfo?.default_account || ''}
                onCleanAccounts={handleCleanDailyByAliases}
            />
        </Box>
        </Box>
    );
}

interface AccountInfoProps {
    account: AccountInfoInterface;
    onToggle: () => void;
    increaseCount: () => void;
    decreaseCount: () => void;
    updateAccountInfo: (updatedAccount: AccountInfoInterface) => void;
    selected: boolean;
    onSelect: () => void;
    onOpenSyncConfig?: (alias: string) => void;
}

function AccountInfo({ account, onToggle, increaseCount, decreaseCount, updateAccountInfo, selected, onSelect, onOpenSyncConfig }: AccountInfoProps) {
    const buttomLoading = useDisclosure();
    const alias = account.name;
    const deleteConfirm = useDisclosure();

    const handleCleanDaily = async () => {
        buttomLoading.onOpen();
        increaseCount();
        toaster.create({ type: 'info', title: `开始为${alias}清理日常...` });
        try {
            const res = await postAccountAreaDaily(alias);
            toaster.create({ type: 'success', title: `${alias}清日常成功` });
            updateAccountInfo(res);
        } catch(err: any) {
             toaster.create({ type: 'error', title: `${alias}清日常失败`, description: (err?.response?.data as string) || '网络错误' });
        } finally {
            buttomLoading.onClose();
            decreaseCount();
        }
    };

    handle.set(account.name, handleCleanDaily);

    const handleDeleteAccount = () => {
        delAccount(alias)
            .then((res) => {
                toaster.create({ type: 'success', title: '删除账号成功', description: res });
                onToggle();
            })
            .catch((err: AxiosError) => {
                toaster.create({ type: 'error', title: '删除账号失败', description: (err?.response?.data as string) || '网络错误' });
            });
    };

    const handleDailyResult = () => {
        toaster.create({ type: 'info', title: `正在获取${alias}的日常结果...` });
        getAccountDailyResultList(alias)
            .then(async (res) => {
                toaster.create({ type: 'success', title: '获取日常结果成功' });
                await NiceModal.show(ResultInfoModal, { alias: alias, title: '日常', resultInfo: res });
            })
            .catch(async (err: AxiosError) => {
                toaster.create({ type: 'error', title: '获取日常结果失败', description: (await (err?.response?.data as Blob).text()) || '网络错误' });
            });
    };

    const cancelRef = React.useRef<HTMLButtonElement>(null);

    // 卡片视图渲染
    return (
        <Card.Root
            key={alias}
            bg={selected ? 'blue.subtle/20' : 'bg.muted'}
            shadow={selected ? 'md' : 'sm'}
            borderRadius="2xl"
            borderWidth={selected ? '2px' : '1px'}
            borderColor={selected ? 'blue.focusRing' : 'border.subtle'}
            transition="all 0.2s"
            _hover={{ shadow: 'lg', transform: 'translateY(-2px)', borderColor: "blue.focusRing" }}
            cursor="pointer"
            onClick={onSelect}
        >
            <Card.Header pb={2}>
                <Flex justify="space-between" align="start">
                    <Stack gap={1}>
                        <HStack>
                             <Radio value={alias} colorPalette="purple" />
                             <Text fontWeight="bold" fontSize="lg" lineHeight="1.2">{alias}</Text>
                             {account.clan_forbid && <Tag.Root size="sm" colorPalette="red" variant="subtle"><Tag.Label>禁用</Tag.Label></Tag.Root>}
                        </HStack>
                    </Stack>

                     <Alert leastDestructiveRef={cancelRef} isOpen={deleteConfirm.open} onClose={deleteConfirm.onClose} title="删除账号" body={`确定删除账号${alias}吗？`} onConfirm={handleDeleteAccount}>
                        {' '}
                    </Alert>

                     <IconButton
                        size="xs"
                        variant="ghost"
                        colorPalette="gray"
                        opacity={0.4}
                        aria-label="Delete"
                        onClick={(e) => {
                            e.stopPropagation();
                            deleteConfirm.onOpen();
                        }}
                        _hover={{ bg: "red.subtle", color: "red.fg", opacity: 1 }}
                        transition="opacity 0.2s"
                    >
                        <CloseButton />
                    </IconButton>
                </Flex>
            </Card.Header>

            <Card.Body py={1.5}>
                <Stack gap={0.5} mt={0.5}>
                    <Flex justify="space-between" align="center">
                        <Text fontSize="xs" color="fg.muted">上次运行</Text>
                        <Text fontSize="xs" fontWeight="semibold">{account.daily_clean_time.time}</Text>
                    </Flex>
                    <Flex justify="space-between" align="center">
                        <Text fontSize="xs" color="fg.muted">状态</Text>
                        <Tag.Root
                            size="sm"
                            variant="subtle"
                            colorPalette={account.daily_clean_time.status === '成功' ? "green" : account.daily_clean_time.status === '警告' ? "orange" : "red"}
                        >
                            <Tag.Label>{account.daily_clean_time.status}</Tag.Label>
                        </Tag.Root>
                    </Flex>
                </Stack>
            </Card.Body>

            <Card.Footer pt={1} pb={2} px={3} onClick={(e) => e.stopPropagation()}>
                <SimpleGrid columns={2} gap={1.5} w="full">
                    <LabeledActionButton label="配置" icon={<FiSettings />} colorPalette="gray" variant="surface" as={Link} // @ts-ignore
                        to={getAccountConfigRoute(alias)} />
                    <LabeledActionButton label="清理" icon={<FiTarget />} colorPalette="gray" variant="surface" onClick={handleCleanDaily} loading={buttomLoading.open} />
                    <LabeledActionButton label="同步" icon={<FiCopy />} colorPalette="gray" variant="surface" onClick={() => onOpenSyncConfig && onOpenSyncConfig(alias)} loading={buttomLoading.open} />
                    <LabeledActionButton label="结果" icon={<FiActivity />} colorPalette="gray" variant="surface" onClick={handleDailyResult} loading={buttomLoading.open} />
                </SimpleGrid>
            </Card.Footer>
        </Card.Root>
    );
}
