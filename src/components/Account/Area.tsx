import { Box, Button, Flex, HStack, Input, SimpleGrid, Text, useDisclosure } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { ModuleResponse } from '@interfaces/Module';
import { Skeleton } from '../../components/ui/skeleton';
import ModuleCard from './ModuleCard';
import ModuleDetail from './ModuleDetail';
import { getAccountConfig, putAccountConfig, postAccountAreaSingle, getAccountAreaSingleResultList } from '@api/Account';
import { AxiosError } from 'axios';
import NiceModal from '@ebay/nice-modal-react';
import ResultInfoModal from './ResultInfoModal';
import { toaster } from '../../components/ui/toaster';

interface AreaProps {
    alias: string,
    keys: string
}

type FilterMode = 'all' | 'enabled' | 'disabled' | 'runnable';

export default function Area({ alias, keys: key }: AreaProps) {
    const [config, setConfig] = useState<ModuleResponse | null>(null);
    const [selectedModule, setSelectedModule] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<FilterMode>('all');
    const [returnScrollY, setReturnScrollY] = useState(0);
    const shouldRestoreScrollRef = useRef(false);
    const returnModuleKeyRef = useRef<string | null>(null);
    const { open: isRunning, onOpen: onStartRun, onClose: onEndRun } = useDisclosure();

    useEffect(() => {
        if (alias && key) {
            getAccountConfig(alias, key).then((res) => {
                setConfig(res);
            }).catch((err) => {
                console.log(err);
            });
        }
    }, [alias, key]);

    useEffect(() => {
        if (!selectedModule && shouldRestoreScrollRef.current) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const targetCard = returnModuleKeyRef.current
                        ? document.querySelector<HTMLElement>(`[data-module-card="${returnModuleKeyRef.current}"]`)
                        : null;

                    if (targetCard) {
                        targetCard.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
                    } else {
                        const scrollContainer = document.querySelector<HTMLElement>('[role="tabpanel"]');
                        if (scrollContainer) {
                            scrollContainer.scrollTo({ top: returnScrollY, behavior: 'auto' });
                        } else {
                            window.scrollTo({ top: returnScrollY, behavior: 'auto' });
                        }
                    }

                    shouldRestoreScrollRef.current = false;
                    returnModuleKeyRef.current = null;
                });
            });
        }
    }, [returnScrollY, selectedModule]);

    const handleToggle = (moduleKey: string, checked: boolean) => {
        putAccountConfig(alias, moduleKey, checked).then((res) => {
            toaster.create({ type: 'success', title: '\u4fdd\u5b58\u6210\u529f', description: res });
            setConfig((prev) => {
                if (!prev) return prev;
                return { ...prev, config: { ...prev.config, [moduleKey]: checked } };
            });
        }).catch((err: AxiosError) => {
            toaster.create({ type: 'error', title: '\u4fdd\u5b58\u5931\u8d25', description: err.response?.data as string || '\u7f51\u7edc\u9519\u8bef' });
        });
    };

    const handleExecute = (moduleKey: string, moduleName: string) => {
        toaster.create({ type: 'info', title: '\u5f00\u59cb\u6267\u884c' + moduleName + '...' });
        onStartRun();
        postAccountAreaSingle(alias, moduleKey).then(async (res) => {
            toaster.create({ type: 'success', title: '\u6267\u884c\u6210\u529f' });
            onEndRun();
            await NiceModal.show(ResultInfoModal, { alias, title: moduleName, resultInfo: res });
        }).catch(async (err: AxiosError) => {
            toaster.create({ type: 'error', title: '\u6267\u884c\u5931\u8d25', description: await (err.response?.data as Blob).text() || '\u7f51\u7edc\u9519\u8bef' });
            onEndRun();
        });
    };

    const handleResult = (moduleKey: string, moduleName: string) => {
        toaster.create({ type: 'info', title: '\u6b63\u5728\u83b7\u53d6' + moduleName + '\u7684\u7ed3\u679c' });
        onStartRun();
        getAccountAreaSingleResultList(alias, moduleKey).then(async (res) => {
            onEndRun();
            await NiceModal.show(ResultInfoModal, { alias, title: moduleName, resultInfo: res });
        }).catch(async (err: AxiosError) => {
            onEndRun();
            toaster.create({ type: 'error', title: '\u83b7\u53d6\u7ed3\u679c\u5931\u8d25', description: await (err.response?.data as Blob).text() || '\u7f51\u7edc\u9519\u8bef' });
        });
    };

    if (!config) {
        return (
            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={3}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <Box key={i} p={3} borderWidth="1px" borderRadius="lg" bg="bg.panel">
                        <Skeleton height="20px" width="60%" mb={2} />
                        <Skeleton height="14px" width="100%" mb={1} />
                        <Skeleton height="14px" width="80%" />
                    </Box>
                ))}
            </SimpleGrid>
        );
    }

    const enabledCount = config.order.filter((k) => !!config.config[k]).length;

    const filtered = config.order.filter((k) => {
        const info = config.info[k];
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q || info.name.toLowerCase().includes(q) || info.description?.toLowerCase().includes(q) || info.tags?.some((t) => t.toLowerCase().includes(q));
        const matchesFilter = filter === 'all' || (filter === 'enabled' && !!config.config[k]) || (filter === 'disabled' && !config.config[k]) || (filter === 'runnable' && info.runnable);
        return matchesSearch && matchesFilter;
    });

    if (selectedModule) {
        const info = config.info[selectedModule];
        return (
            <ModuleDetail
                alias={alias}
                info={info}
                config={config.config}
                onBack={() => {
                    shouldRestoreScrollRef.current = true;
                    setSelectedModule(null);
                }}
                onExecute={() => handleExecute(selectedModule, info.name)}
                onResult={() => handleResult(selectedModule, info.name)}
                isRunning={isRunning}
            />
        );
    }

    return (
        <Box pb={8}>
            <Flex gap={3} mb={4} align="center" wrap="wrap">
                <Text fontSize="sm" color="fg.muted">{`\u5171 ${config.order.length} \u4e2a\u6a21\u5757\uff0c\u5df2\u542f\u7528 ${enabledCount}`}</Text>
                <Input
                    placeholder={'\u641c\u7d22\u6a21\u5757...'}
                    size="sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    maxW="200px"
                    borderRadius="full"
                />
                <HStack gap={1}>
                    {([
                        ['all', '\u5168\u90e8'],
                        ['enabled', '\u5df2\u542f\u7528'],
                        ['disabled', '\u672a\u542f\u7528'],
                        ['runnable', '\u53ef\u6267\u884c'],
                    ] as [FilterMode, string][]).map(([filterKey, label]) => (
                        <Button
                            key={filterKey}
                            size="xs"
                            variant={filter === filterKey ? 'solid' : 'ghost'}
                            colorPalette={filter === filterKey ? 'blue' : 'gray'}
                            onClick={() => setFilter(filterKey)}
                        >
                            {label}
                        </Button>
                    ))}
                </HStack>
            </Flex>
            {filtered.length === 0 ? (
                <Box textAlign="center" py={10}>
                    <Text color="fg.muted">{'\u672a\u627e\u5230\u5339\u914d\u7684\u6a21\u5757'}</Text>
                    <Text color="fg.muted" fontSize="sm" mt={1}>{'\u8bf7\u5c1d\u8bd5\u5176\u4ed6\u641c\u7d22\u6216\u7b5b\u9009\u6761\u4ef6'}</Text>
                </Box>
            ) : (
                <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={3}>
                    {filtered.map((moduleKey) => (
                        <ModuleCard
                            key={moduleKey}
                            alias={alias}
                            moduleKey={moduleKey}
                            info={config.info[moduleKey]}
                            configValue={config.config[moduleKey]}
                            onClick={() => {
                                const scrollContainer = document.querySelector<HTMLElement>('[role="tabpanel"][data-state="open"]');
                                setReturnScrollY(scrollContainer?.scrollTop ?? window.scrollY);
                                returnModuleKeyRef.current = moduleKey;
                                setSelectedModule(moduleKey);
                            }}
                            onToggle={(checked) => handleToggle(moduleKey, checked)}
                            onExecute={(e) => { e.stopPropagation(); handleExecute(moduleKey, config.info[moduleKey].name); }}
                            onResult={(e) => { e.stopPropagation(); handleResult(moduleKey, config.info[moduleKey].name); }}
                            isRunning={isRunning}
                        />
                    ))}
                </SimpleGrid>
            )}
        </Box>
    );
}
