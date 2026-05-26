import { createFileRoute } from "@tanstack/react-router";
import {
    Box, Button, Flex, HStack, Input, Stack, Text, Badge, Tag,
    Spacer, useDisclosure,
} from "@chakra-ui/react";
import {
    FiActivity, FiBook, FiCheck, FiCopy, FiGrid, FiKey, FiLayers, FiList,
    FiSettings, FiTarget, FiUpload, FiUserPlus, FiUserX,
} from "react-icons/fi";
import { Link } from "@tanstack/react-router";
import React, { ChangeEvent, useEffect, useState } from "react";
import { getUserInfo, clearAccounts, deleteAccount, postAccount, postAccountImport, putUserInfo } from "@api/Account";
import type { UserInfoResponse } from "@interfaces/UserInfo";
import DataCenterView from "@components/DataCenter/DataCenterView";
import Alert from "@/components/alert";
import ReadmeModal from "@/components/Account/ReadmeModal";
import resetPasswdModal from "@/components/Users/ResetPasswdModal";
import { toaster } from "@/components/ui/toaster";
import { Tooltip } from "@/components/ui/tooltip";
import { IconButton } from "@/components/ui/icon-button";
import NiceModal from "@ebay/nice-modal-react";
import { AxiosError } from "axios";

export const Route = createFileRoute("/daily/_sidebar/datacenter/")({ component: DataCenterPage });

function DataCenterPage() {
    const [userInfo, setUserInfo] = useState<UserInfoResponse>();
    const [selected, setSelected] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [alias, setAlias] = useState("");
    const createSwitch = useDisclosure();
    const deleteQQConfirm = useDisclosure();
    const clearConfirm = useDisclosure();
    const cancelRef = React.useRef<HTMLButtonElement>(null);

    useEffect(() => { getUserInfo().then(setUserInfo).catch(() => {}); }, []);

    const accounts = userInfo?.accounts ?? [];
    const filtered = accounts.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
    const defaultAcc = userInfo?.default_account || "";

    function toggle(name: string, multi: boolean) {
        if (multi) setSelected(p => p.includes(name) ? p.filter(n => n !== name) : [...p, name]);
        else setSelected([name]);
    }

    const showReadme = () => { NiceModal.show(ReadmeModal, {}).then(() => localStorage.setItem("readme2", "true")).catch(() => localStorage.setItem("readme2", "true")); };
    const handleResetPassword = () => {
        NiceModal.show(resetPasswdModal, {}).then((value: any) => {
            putUserInfo({ password: value }).then(res => { toaster.create({ type: "success", title: "修改密码成功", description: res }); NiceModal.hide(resetPasswdModal).catch(() => {}); })
                .catch((err: AxiosError) => { toaster.create({ type: "error", title: "修改密码失败", description: (err?.response?.data as string) || "网络错误" }); });
        }).catch(() => {});
    };
    const handleDeleteQQ = () => {
        deleteAccount().then(async res => { toaster.create({ type: "success", title: "注销QQ成功", description: res }); deleteQQConfirm.onClose(); }).catch((err: AxiosError) => { toaster.create({ type: "error", title: "注销QQ失败", description: (err?.response?.data as string) || "网络错误" }); });
    };
    const handleClearAll = () => {
        clearAccounts().then(res => { toaster.create({ type: "success", title: "清空账号成功", description: res }); clearConfirm.onClose(); setUserInfo(prev => prev ? { ...prev, accounts: [] } : prev); })
            .catch((err: AxiosError) => { toaster.create({ type: "error", title: "清空账号失败", description: (err?.response?.data as string) || "网络错误" }); });
    };
    const handleCreate = () => {
        if (createSwitch.open) {
            if (!alias.trim()) { toaster.create({ type: "error", title: "账号名称不能为空" }); return; }
            postAccount(alias).then(res => { toaster.create({ type: "success", title: "创建成功", description: res }); createSwitch.onClose(); setAlias(""); getUserInfo().then(setUserInfo).catch(() => {}); })
                .catch((err: AxiosError) => { toaster.create({ type: "error", title: "创建失败", description: (err?.response?.data as string) || "网络错误" }); });
        } else { createSwitch.onOpen(); }
    };
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { postAccountImport(file).then(res => { toaster.create({ type: "success", title: "导入成功", description: res }); getUserInfo().then(setUserInfo).catch(() => {}); }).catch((err: AxiosError) => { toaster.create({ type: "error", title: "导入失败", description: (err?.response?.data as string) || "网络错误" }); }); }
    };

    return (
        <Box display="grid" gridTemplateColumns="360px minmax(0, 1fr)" gap={4} p={4} h="calc(100vh - 56px - 32px)" overflow="hidden">

            {/* ======== Left Column ======== */}
            <Box overflowY="auto" overflowX="hidden" display="flex" flexDirection="column" gap={3} minW={0}>

                {/* 1. Search */}
                <Input size="sm" placeholder="搜索账号..." value={search} onChange={e => setSearch(e.target.value)} borderRadius="full" bg="bg.panel" />

                {/* 2. Welcome + User Actions */}
                <Box bg="bg.panel" borderRadius="lg" borderWidth="1px" borderColor="border.subtle" p={3}>
                    <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                        <Text fontSize="sm" fontWeight="bold">{!userInfo ? "..." : `欢迎, ${userInfo.qq}`}</Text>
                        <HStack gap={1}>
                            <Tooltip content="使用须知"><IconButton aria-label="readme" size="xs" variant="ghost" colorPalette="teal" onClick={showReadme}><FiBook /></IconButton></Tooltip>
                            <Tooltip content="修改密码"><IconButton aria-label="reset-pwd" size="xs" variant="ghost" colorPalette="blue" onClick={handleResetPassword}><FiKey /></IconButton></Tooltip>
                            <Tooltip content="注销QQ"><IconButton aria-label="delete-qq" size="xs" variant="ghost" colorPalette="red" onClick={deleteQQConfirm.onOpen}><FiUserX /></IconButton></Tooltip>
                        </HStack>
                    </Flex>
                </Box>

                {/* 3. Tool Bar */}
                <Box bg="bg.panel" borderRadius="lg" borderWidth="1px" borderColor="border.subtle" p={2}>
                    <Flex align="center" wrap="wrap" gap={1}>
                        <Button size="xs" colorPalette="orange" variant="ghost" onClick={clearConfirm.onOpen}><FiTarget /> 清理全部</Button>
                        <Button size="xs" colorPalette="blue" variant="ghost" as={Link} to="/daily/_sidebar/account/BATCH_RUNNER"><FiLayers /> 批量运行</Button>
                        <Spacer />
                        <Box bg="bg.subtle" p={0.5} borderRadius="md" display="flex" gap={0.5}>
                            <Button size="xs" variant={true ? "solid" : "ghost"} colorPalette="blue" onClick={() => {}} minW="50px" h="28px" px={1}><HStack gap={0.5}><FiList /><Text fontSize="10px">账号列表</Text></HStack></Button>
                            <Button size="xs" variant="ghost" colorPalette="gray" onClick={() => {}} minW="50px" h="28px" px={1}><HStack gap={0.5}><FiGrid /><Text fontSize="10px">账号卡片</Text></HStack></Button>
                        </Box>
                        <Tooltip content="导入账号"><IconButton aria-label="import" size="xs" variant="outline" colorPalette="teal" onClick={() => fileInputRef.current?.click()}><FiUpload /></IconButton></Tooltip>
                        <Input type="file" accept=".tsv" ref={fileInputRef} display="none" onChange={handleImport} />
                        <Tooltip content={createSwitch.open ? "确认创建" : "新增账号"}><IconButton aria-label="add" size="xs" variant="outline" colorPalette="green" onClick={handleCreate}>{createSwitch.open ? <FiCheck /> : <FiUserPlus />}</IconButton></Tooltip>
                    </Flex>
                    {createSwitch.open && <Input size="xs" mt={1} placeholder="输入账号名" value={alias} onChange={e => setAlias(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreate()} />}
                </Box>

                {/* 4. Account List */}
                <Stack flex={1} overflowY="auto" gap={1} minH={0}>
                    {filtered.map(acc => (
                        <Box key={acc.name} p={2} borderRadius="md" cursor="pointer" bg={selected.includes(acc.name) ? "blue.subtle" : "bg.panel"}
                            borderWidth="1px" borderColor={selected.includes(acc.name) ? "blue.400" : "border.subtle"}
                            onClick={e => toggle(acc.name, e.ctrlKey || e.metaKey)} _hover={{ bg: "bg.subtle" }}>
                            <Flex justify="space-between" align="center">
                                <HStack gap={1}>
                                    <Box w={2} h={2} borderRadius="full" bg={acc.daily_clean_time?.status === "成功" ? "green.400" : acc.daily_clean_time?.status === "警告" ? "orange.400" : "gray.400"} />
                                    <Text fontSize="sm" fontWeight="medium">{acc.name}</Text>
                                    {acc.name === defaultAcc && <Badge size="xs" colorPalette="blue">默认</Badge>}
                                </HStack>
                                <Tag.Root size="xs" colorPalette={acc.daily_clean_time?.status === "成功" ? "green" : acc.daily_clean_time?.status === "警告" ? "orange" : "gray"}><Tag.Label>{acc.daily_clean_time?.status || "-"}</Tag.Label></Tag.Root>
                            </Flex>
                            <Text fontSize="xs" color="fg.muted" ml={4}>{acc.daily_clean_time?.time || "暂无运行记录"}</Text>
                            <HStack mt={1} ml={4} gap={1}>
                                <Tooltip content="配置"><IconButton aria-label="config" size="xs" variant="ghost" colorPalette="blue" as={Link} to={`/daily/_sidebar/account/${acc.name}`} onClick={e => e.stopPropagation()}><FiSettings /></IconButton></Tooltip>
                                <Tooltip content="清理"><IconButton aria-label="clean" size="xs" variant="ghost" colorPalette="orange" onClick={e => e.stopPropagation()}><FiTarget /></IconButton></Tooltip>
                                <Tooltip content="同步"><IconButton aria-label="sync" size="xs" variant="ghost" colorPalette="teal" onClick={e => e.stopPropagation()}><FiCopy /></IconButton></Tooltip>
                                <Tooltip content="结果"><IconButton aria-label="result" size="xs" variant="ghost" colorPalette="green" onClick={e => e.stopPropagation()}><FiActivity /></IconButton></Tooltip>
                            </HStack>
                        </Box>
                    ))}
                </Stack>
            </Box>

            {/* ======== Right Column ======== */}
            <Box overflowY="auto" overflowX="hidden" bg="bg.panel" borderRadius="lg" borderWidth="1px" borderColor="border.subtle" p={4} minW={0}>
                <DataCenterView selectedAccounts={selected} defaultAccount={defaultAcc} />
            </Box>

            {/* Dialogs */}
            <Alert leastDestructiveRef={cancelRef} isOpen={deleteQQConfirm.open} onClose={deleteQQConfirm.onClose} title="注销QQ" body={`确定注销QQ ${userInfo?.qq} 吗？`} onConfirm={handleDeleteQQ}>{" "}</Alert>
            <Alert leastDestructiveRef={cancelRef} isOpen={clearConfirm.open} onClose={clearConfirm.onClose} title="清空账号" body="确定清空所有账号吗？" onConfirm={handleClearAll}>{" "}</Alert>
        </Box>
    );
}
