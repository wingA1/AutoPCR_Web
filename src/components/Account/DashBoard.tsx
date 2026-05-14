import { AccountInfo as AccountInfoInterface, UserInfoResponse } from '@interfaces/UserInfo';
import {
    Box,
    Button,
    Card,
    Flex,
    HStack,
    Input,
    SimpleGrid,
    Spacer,
    Stack,
    Table,
    Tag,
    Text,
} from '@chakra-ui/react';
import { FiActivity, FiBook, FiCheck, FiCopy, FiGrid, FiKey, FiLayers, FiList, FiSettings, FiStar, FiTarget, FiUpload, FiUserMinus, FiUserPlus, FiUserX } from 'react-icons/fi';
import { Link, useNavigate } from '@tanstack/react-router';
import { Radio, RadioGroup } from '../../components/ui/radio';
import React, { ChangeEvent, useEffect, useState } from 'react';
import { Skeleton, SkeletonText } from '../../components/ui/skeleton';
import { clearAccounts, deleteAccount, getAccountDailyResultList, getUserInfo, putUserInfo } from '@api/Account';
import { delAccount, postAccount, postAccountAreaDaily, postAccountImport } from '@api/Account';

import Alert from '../alert';
import { AxiosError } from 'axios';
import { Checkbox } from '../../components/ui/checkbox';
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

const handle: Map<string, (arg0: boolean) => void> = new Map<string, (arg0: boolean) => void>();

function ToolbarIconLabelButton({
    label,
    icon,
    active = false,
    onClick,
}: {
    label: string
    icon: React.ReactNode
    active?: boolean
    onClick?: () => void
}) {
    return (
        <Button
            aria-label={label}
            size="xs"
            variant={active ? 'solid' : 'ghost'}
            colorPalette={active ? 'blue' : 'gray'}
            onClick={onClick}
            minW="70px"
            h="40px"
            px={3}
        >
            <HStack gap={1.5}>
                <Box fontSize="14px">{icon}</Box>
                <Text fontSize="11px" fontWeight="medium">{label}</Text>
            </HStack>
        </Button>
    );
}

function CardActionButton({
    label,
    icon,
    colorPalette,
    onClick,
    loading = false,
    as,
    to,
}: {
    label: string
    icon: React.ReactNode
    colorPalette: string
    onClick?: () => void
    loading?: boolean
    as?: any
    to?: string
}) {
    return (
        <Button
            aria-label={label}
            flex="1"
            h="56px"
            variant="ghost"
            colorPalette={colorPalette}
            onClick={onClick}
            loading={loading}
            as={as}
            {...(to ? { to } : {})}
        >
            <Stack gap={0} align="center">
                <Box fontSize="15px">{icon}</Box>
                <Text fontSize="11px" fontWeight="medium">{label}</Text>
            </Stack>
        </Button>
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
    const [isTableView, setIsTableView] = useState<boolean>(() => {
        const savedView = localStorage.getItem('accountViewMode');
        return savedView ? savedView === 'table' : false;
    });
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');

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
            })
            .catch((err: AxiosError) => {
                toaster.create({ type: 'error', title: (err?.response?.data as string) || '\u7f51\u7edc\u9519\u8bef' });
            });
    }, [freshAccountInfo.open]);

    const handleDefaultAccount = (value: string) => {
        putUserInfo({ default_account: value })
            .then((res) => {
                setUserInfo((prev) => prev ? { ...prev, default_account: value } : prev);
                toaster.create({ type: 'success', title: '\u8bbe\u7f6e\u9ed8\u8ba4\u8d26\u53f7\u6210\u529f', description: res });
            })
            .catch((err: AxiosError) => {
                toaster.create({ type: 'error', title: '\u8bbe\u7f6e\u9ed8\u8ba4\u8d26\u53f7\u5931\u8d25', description: (err?.response?.data as string) || '\u7f51\u7edc\u9519\u8bef' });
            });
    };

    const handleResetPassword = () => {
        NiceModal.show(resetPasswdModal, {})
            .then((value) => {
                putUserInfo({ password: value as string })
                    .then((res) => {
                        toaster.create({ type: 'success', title: '\u4fee\u6539\u5bc6\u7801\u6210\u529f', description: res });
                        NiceModal.hide(resetPasswdModal).catch(() => undefined);
                    })
                    .catch((err: AxiosError) => {
                        toaster.create({ type: 'error', title: '\u4fee\u6539\u5bc6\u7801\u5931\u8d25', description: (err?.response?.data as string) || '\u7f51\u7edc\u9519\u8bef' });
                    });
            })
            .catch(() => undefined);
    };

    const updateAccountInfo = (updatedAccount: AccountInfoInterface) => {
        setUserInfo((prevUserInfo) => {
            if (!prevUserInfo?.accounts) {
                return prevUserInfo;
            }

            const updatedAccounts = prevUserInfo.accounts.map((account) => (
                account.name === updatedAccount.name ? updatedAccount : account
            ));

            return {
                ...prevUserInfo,
                accounts: updatedAccounts,
            };
        });
    };

    const handleCleanDailyAll = () => {
        if (isTableView && selectedAccounts.length > 0) {
            for (const accountName of selectedAccounts) {
                const fn = handle.get(accountName);
                if (fn) fn(false);
            }
        } else {
            for (const fn of handle.values()) {
                fn(false);
            }
        }
    };

    const toggleSelectAccount = (accountName: string) => {
        setSelectedAccounts((prev) => (
            prev.includes(accountName)
                ? prev.filter((name) => name !== accountName)
                : [...prev, accountName]
        ));
    };

    const toggleSelectAll = () => {
        const filtered = (userInfo?.accounts ?? []).filter((acc) => acc.name.toLowerCase().includes(searchQuery.toLowerCase()));
        if (selectedAccounts.length === filtered.length && filtered.length > 0) {
            setSelectedAccounts([]);
        } else {
            setSelectedAccounts(filtered.map((acc) => acc.name));
        }
    };

    const handleCreateAccount = () => {
        if (creatAccountSwitch.open) {
            if (!alias || alias.trim() === '') {
                toaster.create({
                    type: 'error',
                    title: '\u521b\u5efa\u8d26\u53f7\u5931\u8d25',
                    description: '\u8d26\u53f7\u540d\u79f0\u4e0d\u80fd\u4e3a\u7a7a',
                });
                return;
            }

            postAccount(alias)
                .then((res) => {
                    toaster.create({
                        type: 'success',
                        title: '\u521b\u5efa\u8d26\u53f7\u6210\u529f',
                        description: res,
                    });
                    creatAccountSwitch.onToggle();
                    setAlias('');
                    freshAccountInfo.onToggle();
                })
                .catch((err: AxiosError) => {
                    toaster.create({
                        type: 'error',
                        title: '\u521b\u5efa\u8d26\u53f7\u5931\u8d25',
                        description: (err?.response?.data as string) || '\u7f51\u7edc\u9519\u8bef',
                    });
                });
        } else {
            creatAccountSwitch.onToggle();
        }
    };

    const handleAccountImport = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            postAccountImport(file)
                .then((res) => {
                    toaster.create({ type: 'success', title: '\u5bfc\u5165\u8d26\u53f7\u6210\u529f', description: res });
                    freshAccountInfo.onToggle();
                })
                .catch((err: AxiosError) => {
                    toaster.create({ type: 'error', title: '\u5bfc\u5165\u8d26\u53f7\u5931\u8d25', description: (err?.response?.data as string) || '\u7f51\u7edc\u9519\u8bef' });
                });
        }
    };

    const cancelRef = React.useRef<HTMLButtonElement>(null);
    const navigate = useNavigate();

    const handleDeleteAccount = () => {
        deleteAccount()
            .then(async (res) => {
                toaster.create({ type: 'success', title: '\u6ce8\u9500QQ\u6210\u529f', description: res });
                deleteQQConfirm.onToggle();
                await navigate({ to: LoginRoute.to });
            })
            .catch((err: AxiosError) => {
                toaster.create({ type: 'error', title: '\u6ce8\u9500QQ\u5931\u8d25', description: (err?.response?.data as string) || '\u7f51\u7edc\u9519\u8bef' });
            });
    };

    const handleClearAccounts = () => {
        clearAccounts()
            .then((res) => {
                toaster.create({ type: 'success', title: '\u6e05\u7a7a\u8d26\u53f7\u6210\u529f', description: res });
                clearAccountConfirm.onToggle();
                freshAccountInfo.onToggle();
            })
            .catch((err: AxiosError) => {
                toaster.create({ type: 'error', title: '\u6e05\u7a7a\u8d26\u53f7\u5931\u8d25', description: (err?.response?.data as string) || '\u7f51\u7edc\u9519\u8bef' });
            });
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    return (
        <Stack gap={4} h="full" w="full" p={4} position="relative" zIndex={1}>
            <Input
                placeholder={'\u641c\u7d22\u8d26\u53f7\u540d\u79f0...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="sm"
                borderRadius="full"
                bg="bg.panel"
                maxW="400px"
            />

            <Card.Root variant="elevated" bg="bg.panel" shadow="sm" borderRadius="lg" borderWidth="1px" borderColor="border.subtle">
                <Card.Body py={2} px={4}>
                    <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                        <Box>
                            <Text fontSize="md" fontWeight="bold">
                                {!userInfo ? <Skeleton height="20px" width="100px" /> : `\u6b22\u8fce\u56de\u6765, ${userInfo.qq}`}
                            </Text>
                        </Box>

                        <HStack gap={2}>
                            <Button size="xs" variant="surface" colorPalette="teal" onClick={showReadme}>
                                <FiBook /> {'\u4f7f\u7528\u987b\u77e5'}
                            </Button>
                            <Button size="xs" variant="surface" colorPalette="blue" onClick={handleResetPassword}>
                                <FiKey /> {'\u4fee\u6539\u5bc6\u7801'}
                            </Button>
                            <Button size="xs" variant="surface" colorPalette="red" onClick={deleteQQConfirm.onOpen}>
                                <FiUserX /> {'\u6ce8\u9500QQ'}
                            </Button>
                        </HStack>
                    </Flex>
                </Card.Body>
            </Card.Root>

            <Alert
                leastDestructiveRef={cancelRef}
                isOpen={deleteQQConfirm.open}
                onClose={deleteQQConfirm.onClose}
                title={'\u6ce8\u9500QQ'}
                body={`\u786e\u5b9a\u6ce8\u9500QQ ${userInfo?.qq} \u5417\uff1f`}
                onConfirm={handleDeleteAccount}
            >
                {' '}
            </Alert>

            <Flex
                bg="bg.panel"
                p={1}
                borderRadius="lg"
                shadow="sm"
                borderWidth="1px"
                borderColor="border.subtle"
                align="center"
                wrap="wrap"
                gap={2}
            >
                <HStack gap={2}>
                    <Button
                        size="sm"
                        colorPalette="orange"
                        variant="ghost"
                        onClick={handleCleanDailyAll}
                        loading={count !== 0}
                    >
                        <FiTarget /> {isTableView && selectedAccounts.length > 0 ? `\u6e05\u9009\u62e9(${selectedAccounts.length})` : '\u6e05\u7406\u5168\u90e8'}
                    </Button>
                    <Button
                        as={Link}
                        size="sm"
                        colorPalette="blue"
                        variant="ghost"
                        // @ts-ignore
                        to={`${DashBoardRoute.to || ''}BATCH_RUNNER`}
                        loading={count !== 0}
                    >
                        <FiLayers /> {'\u6279\u91cf\u8fd0\u884c'}
                    </Button>
                </HStack>

                <Spacer />

                <HStack gap={2}>
                    <Box bg="bg.subtle" p={1} borderRadius="md" display="flex" gap={1}>
                        <Tooltip content={'\u8868\u683c\u89c6\u56fe'}>
                            <ToolbarIconLabelButton
                                label={'\u5217\u8868'}
                                icon={<FiList />}
                                active={isTableView}
                                onClick={() => {
                                    setIsTableView(true);
                                    localStorage.setItem('accountViewMode', 'table');
                                }}
                            />
                        </Tooltip>
                        <Tooltip content={'\u5361\u7247\u89c6\u56fe'}>
                            <ToolbarIconLabelButton
                                label={'\u5361\u7247'}
                                icon={<FiGrid />}
                                active={!isTableView}
                                onClick={() => {
                                    setIsTableView(false);
                                    localStorage.setItem('accountViewMode', 'card');
                                }}
                            />
                        </Tooltip>
                    </Box>

                    {isTableView && selectedAccounts.length === 1 && (
                        <HStack gap={1} separator={<Box w="1px" h="15px" bg="border.subtle" />}>
                            <Tooltip content={`\u5c06\u5176\u4ed6\u8d26\u53f7\u914d\u7f6e\u540c\u6b65\u4e3a ${selectedAccounts[0]} \u7684\u914d\u7f6e`}>
                                <IconButton
                                    aria-label="Sync configuration"
                                    size="sm"
                                    variant="ghost"
                                    colorPalette="teal"
                                    onClick={() => {
                                        NiceModal.show(ConfigSyncModal, { sourceAccount: selectedAccounts[0] });
                                    }}
                                >
                                    <FiCopy />
                                </IconButton>
                            </Tooltip>
                            <Tooltip content={`\u5c06 ${selectedAccounts[0]} \u8bbe\u4e3a\u9ed8\u8ba4\u8d26\u53f7`}>
                                <IconButton
                                    aria-label="Set as default"
                                    size="sm"
                                    variant="ghost"
                                    colorPalette="purple"
                                    onClick={() => handleDefaultAccount(selectedAccounts[0])}
                                >
                                    <FiStar />
                                </IconButton>
                            </Tooltip>
                        </HStack>
                    )}

                    <HStack gap={1}>
                        {userInfo?.clan && (
                            <Tooltip content={'\u5bfc\u5165\u8d26\u53f7 (TSV)'}>
                                <IconButton
                                    aria-label="Import accounts"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <FiUpload />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Input
                            ref={fileInputRef}
                            type="file"
                            accept=".tsv"
                            onChange={handleAccountImport}
                            onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                            display="none"
                        />

                        <Tooltip content={isTableView && selectedAccounts.length > 0 ? `\u5220\u9664\u9009\u4e2d(${selectedAccounts.length})` : '\u5220\u9664\u5168\u90e8'}>
                            <IconButton
                                aria-label="Delete selected accounts"
                                size="sm"
                                variant="outline"
                                colorPalette="red"
                                onClick={() => {
                                    if (isTableView && selectedAccounts.length > 0) {
                                        if (window.confirm(`\u786e\u5b9a\u5220\u9664\u9009\u4e2d\u7684 ${selectedAccounts.length} \u4e2a\u8d26\u53f7\u5417\uff1f`)) {
                                            Promise.all(selectedAccounts.map((name) => delAccount(name)))
                                                .then(() => {
                                                    toaster.create({ type: 'success', title: '\u5220\u9664\u6210\u529f' });
                                                    setSelectedAccounts([]);
                                                    freshAccountInfo.onToggle();
                                                })
                                                .catch((err) => toaster.create({ type: 'error', title: '\u5220\u9664\u5931\u8d25', description: (err?.response?.data as string) || '\u7f51\u7edc\u9519\u8bef' }));
                                        }
                                    } else {
                                        clearAccountConfirm.onOpen();
                                    }
                                }}
                            >
                                <FiUserMinus />
                            </IconButton>
                        </Tooltip>

                        <Box position="relative">
                            <Tooltip content={creatAccountSwitch.open ? '\u53d6\u6d88\u521b\u5efa' : '\u521b\u5efa\u65b0\u8d26\u53f7'}>
                                <IconButton
                                    aria-label={creatAccountSwitch.open ? 'Confirm creation' : 'Create account'}
                                    size="sm"
                                    variant="solid"
                                    colorPalette={creatAccountSwitch.open ? 'red' : 'green'}
                                    onClick={() => {
                                        if (creatAccountSwitch.open && !alias) creatAccountSwitch.onToggle();
                                        else if (creatAccountSwitch.open && alias) handleCreateAccount();
                                        else creatAccountSwitch.onToggle();
                                    }}
                                >
                                    {creatAccountSwitch.open ? <FiCheck /> : <FiUserPlus />}
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </HStack>
                </HStack>
            </Flex>

            {creatAccountSwitch.open && (
                <Flex
                    bg="bg.panel"
                    p={3}
                    borderRadius="lg"
                    shadow="sm"
                    borderWidth="1px"
                    borderColor="green.subtle"
                    align="center"
                    gap={4}
                    animation="fade-in 0.2s"
                >
                    <Text fontWeight="bold" whiteSpace="nowrap">{'\u65b0\u8d26\u53f7\u540d\u79f0'}</Text>
                    <Input
                        autoFocus
                        placeholder={'\u8bf7\u8f93\u5165\u6e38\u620f\u8d26\u53f7\u6635\u79f0...'}
                        value={alias}
                        onChange={(e) => setAlias(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAccount(); }}
                    />
                    <Button size="sm" colorPalette="green" onClick={handleCreateAccount}>{'\u521b\u5efa'}</Button>
                </Flex>
            )}

            <Alert
                leastDestructiveRef={cancelRef}
                isOpen={clearAccountConfirm.open}
                onClose={clearAccountConfirm.onClose}
                title={'\u5220\u9664\u6240\u6709\u8d26\u53f7'}
                body={'\u786e\u5b9a\u5220\u9664\u6240\u6709\u8d26\u53f7\u5417\uff1f'}
                onConfirm={handleClearAccounts}
            >
                {' '}
            </Alert>

            {isTableView ? (
                <Box flex={1} overflow={'auto'} borderRadius="xl">
                    <Table.Root variant="line" size="sm" bg="bg.panel" borderRadius="xl" boxShadow="sm" ml="0" mr="auto">
                        <Table.Header position="sticky" top={0} bg="bg.panel" zIndex={1} boxShadow="xs">
                            <Table.Row>
                                <Table.ColumnHeader px={2} fontSize="xs" py={2} fontWeight="bold" width="5%">
                                    <Checkbox
                                        checked={(() => {
                                            const fc = (userInfo?.accounts ?? []).filter((acc) => acc.name.toLowerCase().includes(searchQuery.toLowerCase()));
                                            if (selectedAccounts.length > 0 && selectedAccounts.length < fc.length) return 'indeterminate';
                                            return selectedAccounts.length > 0 && selectedAccounts.length === fc.length;
                                        })()}
                                        onCheckedChange={toggleSelectAll}
                                        colorPalette="blue"
                                    />
                                </Table.ColumnHeader>
                                <Table.ColumnHeader px={2} fontSize="xs" py={2} fontWeight="bold" width="20%" minWidth="80px">
                                    {'\u8d26\u53f7'}
                                </Table.ColumnHeader>
                                <Table.ColumnHeader px={2} fontSize="xs" py={2} fontWeight="bold" width="15%">
                                    {'\u72b6\u6001'}
                                </Table.ColumnHeader>
                                <Table.ColumnHeader px={2} fontSize="xs" py={2} fontWeight="bold" width="20%">
                                    {'\u6700\u8fd1\u8fd0\u884c\u65f6\u95f4'}
                                </Table.ColumnHeader>
                                <Table.ColumnHeader px={2} fontSize="xs" py={2} fontWeight="bold" width="15%">
                                    {'\u6807\u8bb0'}
                                </Table.ColumnHeader>
                                <Table.ColumnHeader px={2} fontSize="xs" py={2} fontWeight="bold" width="25%">
                                    {'\u64cd\u4f5c'}
                                </Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {!userInfo ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <Table.Row key={i} bg="transparent">
                                        <Table.Cell px={3} py={2}><Skeleton height="20px" width="20px" /></Table.Cell>
                                        <Table.Cell px={0} py={2}><Skeleton height="20px" width="80%" /></Table.Cell>
                                        <Table.Cell px={3} py={2}><Skeleton height="20px" width="60%" /></Table.Cell>
                                        <Table.Cell px={3} py={2}><Skeleton height="32px" width="100%" /></Table.Cell>
                                    </Table.Row>
                                ))
                            ) : (
                                (userInfo.accounts ?? []).filter((acc) => acc.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                                    <Table.Row>
                                        <Table.Cell colSpan={6} textAlign="center" py={8}>
                                            <Text color="fg.muted">{'\u672a\u627e\u5230\u5339\u914d\u7684\u8d26\u53f7'}</Text>
                                            <Text color="fg.muted" fontSize="sm" mt={1}>{'\u8bf7\u5c1d\u8bd5\u5176\u4ed6\u641c\u7d22\u5173\u952e\u8bcd'}</Text>
                                        </Table.Cell>
                                    </Table.Row>
                                ) : (
                                    (userInfo.accounts ?? []).filter((acc) => acc.name.toLowerCase().includes(searchQuery.toLowerCase())).map((account) => (
                                        <AccountInfo
                                            key={account.name}
                                            account={account}
                                            onToggle={freshAccountInfo.onToggle}
                                            increaseCount={increaseCount}
                                            decreaseCount={decreaseCount}
                                            updateAccountInfo={updateAccountInfo}
                                            isTableView={isTableView}
                                            isSelected={selectedAccounts.includes(account.name)}
                                            onToggleSelect={() => toggleSelectAccount(account.name)}
                                            defaultAccount={userInfo.default_account}
                                            onOpenSyncConfig={(accountAlias) => {
                                                NiceModal.show(ConfigSyncModal, { sourceAccount: accountAlias });
                                            }}
                                        />
                                    ))
                                )
                            )}
                        </Table.Body>
                    </Table.Root>
                </Box>
            ) : (
                <RadioGroup onValueChange={(e) => handleDefaultAccount(e.value || '')} value={userInfo?.default_account} flex={1} overflow={'auto'} p={1}>
                    <Stack>
                        <SimpleGrid gap={4} templateColumns="repeat(auto-fill, minmax(280px, 1fr))">
                            {!userInfo ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <Card.Root key={i} bg="bg.panel" borderRadius="xl" shadow="sm">
                                        <Card.Header><Skeleton height="24px" width="50%" /></Card.Header>
                                        <Card.Body><SkeletonText noOfLines={3} gap={4} /></Card.Body>
                                        <Card.Footer><Skeleton height="32px" width="100%" /></Card.Footer>
                                    </Card.Root>
                                ))
                            ) : (
                                (userInfo.accounts ?? []).filter((acc) => acc.name.toLowerCase().includes(searchQuery.toLowerCase())).map((account) => (
                                    <AccountInfo
                                        key={account.name}
                                        account={account}
                                        onToggle={freshAccountInfo.onToggle}
                                        increaseCount={increaseCount}
                                        decreaseCount={decreaseCount}
                                        updateAccountInfo={updateAccountInfo}
                                        isTableView={isTableView}
                                        isSelected={selectedAccounts.includes(account.name)}
                                        onToggleSelect={() => toggleSelectAccount(account.name)}
                                        defaultAccount={userInfo.default_account}
                                        onOpenSyncConfig={(accountAlias) => {
                                            NiceModal.show(ConfigSyncModal, { sourceAccount: accountAlias });
                                        }}
                                    />
                                ))
                            )}
                        </SimpleGrid>
                    </Stack>
                </RadioGroup>
            )}
        </Stack>
    );
}

interface AccountInfoProps {
    account: AccountInfoInterface;
    onToggle: () => void;
    increaseCount: () => void;
    decreaseCount: () => void;
    updateAccountInfo: (updatedAccount: AccountInfoInterface) => void;
    isTableView?: boolean;
    isSelected?: boolean;
    onToggleSelect?: () => void;
    defaultAccount?: string;
    onOpenSyncConfig?: (alias: string) => void;
}

function AccountInfo({ account, onToggle, increaseCount, decreaseCount, updateAccountInfo, isTableView = false, isSelected = false, onToggleSelect, defaultAccount, onOpenSyncConfig }: AccountInfoProps) {
    const buttomLoading = useDisclosure();
    const alias = account.name;
    const deleteConfirm = useDisclosure();

    const handleCleanDaily = async () => {
        buttomLoading.onOpen();
        increaseCount();
        toaster.create({ type: 'info', title: `\u5f00\u59cb\u4e3a ${alias} \u6e05\u7406\u65e5\u5e38...` });
        try {
            const res = await postAccountAreaDaily(alias);
            toaster.create({ type: 'success', title: `${alias} \u6e05\u7406\u65e5\u5e38\u6210\u529f` });
            updateAccountInfo(res);
        } catch (err: any) {
            toaster.create({ type: 'error', title: `${alias} \u6e05\u7406\u65e5\u5e38\u5931\u8d25`, description: (err?.response?.data as string) || '\u7f51\u7edc\u9519\u8bef' });
        } finally {
            buttomLoading.onClose();
            decreaseCount();
        }
    };

    handle.set(account.name, handleCleanDaily);

    const handleDeleteAccount = () => {
        delAccount(alias)
            .then((res) => {
                toaster.create({ type: 'success', title: '\u5220\u9664\u8d26\u53f7\u6210\u529f', description: res });
                onToggle();
            })
            .catch((err: AxiosError) => {
                toaster.create({ type: 'error', title: '\u5220\u9664\u8d26\u53f7\u5931\u8d25', description: (err?.response?.data as string) || '\u7f51\u7edc\u9519\u8bef' });
            });
    };

    const handleDailyResult = () => {
        toaster.create({ type: 'info', title: `\u6b63\u5728\u83b7\u53d6 ${alias} \u7684\u65e5\u5e38\u7ed3\u679c...` });
        getAccountDailyResultList(alias)
            .then(async (res) => {
                toaster.create({ type: 'success', title: '\u83b7\u53d6\u65e5\u5e38\u7ed3\u679c\u6210\u529f' });
                await NiceModal.show(ResultInfoModal, { alias, title: '\u65e5\u5e38', resultInfo: res });
            })
            .catch(async (err: AxiosError) => {
                toaster.create({ type: 'error', title: '\u83b7\u53d6\u65e5\u5e38\u7ed3\u679c\u5931\u8d25', description: (await (err?.response?.data as Blob).text()) || '\u7f51\u7edc\u9519\u8bef' });
            });
    };

    const cancelRef = React.useRef<HTMLButtonElement>(null);

    const StatusBadge = () => {
        let color = 'red';
        let icon = <FiUserX />;
        let text = '\u672a\u77e5';

        if (account.daily_clean_time.status === '\u6210\u529f') {
            color = 'green';
            icon = <FiCheck />;
            text = '\u5b8c\u6210';
        } else if (account.daily_clean_time.status === '\u8b66\u544a') {
            color = 'orange';
            icon = <FiActivity />;
            text = '\u8b66\u544a';
        }

        return (
            <Tag.Root colorPalette={color} variant="subtle">
                <Tag.StartElement>{icon}</Tag.StartElement>
                <Tag.Label>{text} {account.daily_clean_time.time}</Tag.Label>
            </Tag.Root>
        );
    };

    if (isTableView) {
        return (
            <Table.Row
                key={alias}
                bg="bg.panel"
                _hover={{
                    bg: 'bg.muted',
                    transition: 'background-color 0.2s',
                }}
            >
                <Table.Cell px={2} py={2} width="50px">
                    <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} colorPalette="blue" />
                </Table.Cell>
                <Table.Cell px={2} py={2}>
                    <Text fontWeight="bold" fontSize="sm">{alias}</Text>
                </Table.Cell>
                <Table.Cell px={2} py={2}>
                    <StatusBadge />
                </Table.Cell>
                <Table.Cell px={2} py={2}>
                    <Text fontSize="xs" color="fg.muted">{account.daily_clean_time.time}</Text>
                </Table.Cell>
                <Table.Cell px={2} py={2}>
                    <HStack gap={1}>
                        {defaultAccount === account.name && (
                            <Tag.Root size="sm" colorPalette="purple" variant="solid">
                                <Tag.Label>{'\u9ed8\u8ba4'}</Tag.Label>
                            </Tag.Root>
                        )}
                        {account.clan_forbid && (
                            <Tag.Root size="sm" colorPalette="red" variant="solid">
                                <Tag.Label>{'\u516c\u4f1a\u6218\u7981\u7528'}</Tag.Label>
                            </Tag.Root>
                        )}
                    </HStack>
                </Table.Cell>
                <Table.Cell px={2} py={2}>
                    <HStack gap={1}>
                        <Tooltip content={'\u914d\u7f6e'}>
                            <IconButton
                                aria-label="Settings"
                                as={Link}
                                // @ts-ignore
                                to={`${DashBoardRoute.to || ''}${account.name}`}
                                size="xs"
                                variant="ghost"
                                colorPalette="blue"
                            >
                                <FiSettings />
                            </IconButton>
                        </Tooltip>

                        <Tooltip content={'\u6e05\u7406\u65e5\u5e38'}>
                            <IconButton aria-label="Clean Daily" size="xs" variant="ghost" colorPalette="orange" onClick={handleCleanDaily} loading={buttomLoading.open}>
                                <FiTarget />
                            </IconButton>
                        </Tooltip>

                        <Tooltip content={'\u540c\u6b65\u914d\u7f6e'}>
                            <IconButton aria-label="Sync Config" size="xs" variant="ghost" colorPalette="teal" onClick={() => onOpenSyncConfig && onOpenSyncConfig(alias)} loading={buttomLoading.open}>
                                <FiCopy />
                            </IconButton>
                        </Tooltip>

                        <Tooltip content={'\u7ed3\u679c'}>
                            <IconButton aria-label="View Results" size="xs" variant="ghost" colorPalette="green" onClick={handleDailyResult} loading={buttomLoading.open}>
                                <FiActivity />
                            </IconButton>
                        </Tooltip>
                    </HStack>
                </Table.Cell>
            </Table.Row>
        );
    }

    return (
        <Card.Root
            key={alias}
            bg="bg.panel"
            shadow="sm"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="border.subtle"
            transition="all 0.2s"
            _hover={{ shadow: 'md', borderColor: 'blue.400' }}
        >
            <Card.Header pb={1} pt={2}>
                <Flex justify="space-between" align="start">
                    <Stack gap={1}>
                        <HStack>
                            <Radio value={alias} colorPalette="purple" />
                            <Text fontWeight="bold" fontSize="lg" lineHeight="1.2">{alias}</Text>
                            {account.clan_forbid && (
                                <Tag.Root size="sm" colorPalette="red" variant="subtle">
                                    <Tag.Label>{'\u7981\u7528'}</Tag.Label>
                                </Tag.Root>
                            )}
                        </HStack>
                    </Stack>

                    <Alert
                        leastDestructiveRef={cancelRef}
                        isOpen={deleteConfirm.open}
                        onClose={deleteConfirm.onClose}
                        title={'\u5220\u9664\u8d26\u53f7'}
                        body={`\u786e\u5b9a\u5220\u9664\u8d26\u53f7 ${alias} \u5417\uff1f`}
                        onConfirm={handleDeleteAccount}
                    >
                        {' '}
                    </Alert>

                    <IconButton
                        size="xs"
                        variant="ghost"
                        colorPalette="gray"
                        aria-label="Delete"
                        onClick={deleteConfirm.onOpen}
                        _hover={{ bg: 'red.subtle', color: 'red.fg' }}
                    >
                        <CloseButton />
                    </IconButton>
                </Flex>
            </Card.Header>

            <Card.Body py={1}>
                <Stack gap={3} mt={2}>
                    <Box bg="bg.subtle" p={2} borderRadius="lg">
                        <Flex justify="space-between" align="center" mb={1}>
                            <Text fontSize="xs" color="fg.muted">{'\u4e0a\u6b21\u8fd0\u884c'}</Text>
                            <Text fontSize="xs" fontWeight="bold">{account.daily_clean_time.time}</Text>
                        </Flex>
                        <Flex justify="space-between" align="center">
                            <Text fontSize="xs" color="fg.muted">{'\u72b6\u6001'}</Text>
                            <Tag.Root
                                size="sm"
                                colorPalette={account.daily_clean_time.status === '\u6210\u529f' ? 'green' : account.daily_clean_time.status === '\u8b66\u544a' ? 'orange' : 'red'}
                            >
                                <Tag.Label>{account.daily_clean_time.status}</Tag.Label>
                            </Tag.Root>
                        </Flex>
                    </Box>
                </Stack>
            </Card.Body>

            <Card.Footer pt={1} pb={2}>
                <HStack gap={0} w="full" justify="space-between">
                    <Tooltip content={'\u8be6\u7ec6\u914d\u7f6e'}>
                        <CardActionButton label={'\u914d\u7f6e'} icon={<FiSettings />} colorPalette="blue" as={Link} // @ts-ignore
                            to={DashBoardRoute.to + alias} />
                    </Tooltip>

                    <Tooltip content={'\u7acb\u5373\u6e05\u7406'}>
                        <CardActionButton label={'\u6e05\u7406'} icon={<FiTarget />} colorPalette="orange" onClick={handleCleanDaily} loading={buttomLoading.open} />
                    </Tooltip>

                    <Tooltip content={'\u540c\u6b65\u914d\u7f6e'}>
                        <CardActionButton label={'\u540c\u6b65'} icon={<FiCopy />} colorPalette="teal" onClick={() => onOpenSyncConfig && onOpenSyncConfig(alias)} loading={buttomLoading.open} />
                    </Tooltip>

                    <Tooltip content={'\u8fd0\u884c\u7ed3\u679c'}>
                        <CardActionButton label={'\u7ed3\u679c'} icon={<FiActivity />} colorPalette="green" onClick={handleDailyResult} loading={buttomLoading.open} />
                    </Tooltip>
                </HStack>
            </Card.Footer>
        </Card.Root>
    );
}
