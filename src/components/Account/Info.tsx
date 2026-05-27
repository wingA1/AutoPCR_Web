import {
    Button,
    Card,
    Flex,
    Heading,
    Input,
    NativeSelect,
    SimpleGrid,
    Stack,
    Text,
    VStack,
    useDisclosure,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { useEffect, useState } from 'react';

import { AccountResponse } from '@/interfaces/Account';
import { AxiosError } from 'axios';
import { Checkbox } from '../../components/ui/checkbox';
import { Field } from '../../components/ui/field';
import { putAccount } from '@/api/Account';
import { toaster } from '../../components/ui/toaster';

interface InfoProps {
    accountInfo: AccountResponse;
    onSaveSuccess?: () => void;
}

const NEW_ACCOUNT_CONFIG_KEY = 'autopcr:new-account-config';

const fadeEntry = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export default function Info({ accountInfo, onSaveSuccess }: InfoProps) {
    const isNewAccountConfig = sessionStorage.getItem(NEW_ACCOUNT_CONFIG_KEY) === accountInfo?.alias
        || new URLSearchParams(window.location.search).get('newAccount') === '1';
    const [username, setUsername] = useState<string>(isNewAccountConfig ? '' : accountInfo?.username || '');
    const [password, setPassword] = useState<string>(isNewAccountConfig ? '' : accountInfo?.password || '');
    const [channel, setChannel] = useState<string>(accountInfo?.channel || '');
    const [batchAccounts, setBatchAccounts] = useState<(string | number)[]>(accountInfo?.batch_accounts || []);
    const { open: isOpen, onOpen, onClose } = useDisclosure();
    const [allChecked, setAllChecked] = useState<boolean>(false);
    const [unselectedAccounts, setUnselectedAccounts] = useState<(string | number)[]>([]);

    useEffect(() => {
        const newAccountAlias = sessionStorage.getItem(NEW_ACCOUNT_CONFIG_KEY);
        const shouldClearLogin = newAccountAlias === accountInfo?.alias
            || new URLSearchParams(window.location.search).get('newAccount') === '1';
        setUsername(shouldClearLogin ? '' : accountInfo?.username || '');
        setPassword(shouldClearLogin ? '' : accountInfo?.password || '');
        setChannel(accountInfo?.channel || '');
        setBatchAccounts(accountInfo?.batch_accounts || []);
        if (accountInfo?.all_accounts && accountInfo?.batch_accounts) {
            const unselected = accountInfo.all_accounts.filter((account) => !accountInfo.batch_accounts.includes(account));
            setUnselectedAccounts(unselected);
            setAllChecked(accountInfo.batch_accounts.length === accountInfo.all_accounts.length);
        } else {
            setUnselectedAccounts([]);
            setAllChecked(false);
        }
    }, [accountInfo]);

    const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        onOpen();
            putAccount(accountInfo?.alias, username, password, channel, batchAccounts)
            .then((res) => {
                toaster.create({ title: '\u4fdd\u5b58\u6210\u529f', description: res, type: 'success' });
                if (sessionStorage.getItem(NEW_ACCOUNT_CONFIG_KEY) === accountInfo?.alias) {
                    sessionStorage.removeItem(NEW_ACCOUNT_CONFIG_KEY);
                }
                if (new URLSearchParams(window.location.search).get('newAccount') === '1') {
                    window.history.replaceState({}, '', window.location.pathname);
                }
                if (onSaveSuccess) {
                    onSaveSuccess();
                }
            })
            .catch((err: AxiosError) => {
                toaster.create({ title: '\u4fdd\u5b58\u5931\u8d25', description: (err.response?.data as string) || '\u7f51\u7edc\u9519\u8bef', type: 'error' });
            })
            .finally(() => {
                onClose();
            });
    };

    const onAllCheckedChange = (details: { checked: boolean | 'indeterminate' }) => {
        const isChecked = !!details.checked;
        setAllChecked(isChecked);

        if (isChecked) {
            setBatchAccounts(accountInfo?.all_accounts ? [...accountInfo.all_accounts] : []);
            setUnselectedAccounts([]);
        } else {
            setBatchAccounts([]);
            setUnselectedAccounts(accountInfo?.all_accounts ? [...accountInfo.all_accounts] : []);
        }
    };

    const handleAccountToggle = (account: string | number) => {
        if (batchAccounts.includes(account)) {
            setBatchAccounts(batchAccounts.filter((item) => item !== account));
            setUnselectedAccounts([...unselectedAccounts, account]);
        } else {
            setBatchAccounts([...batchAccounts, account]);
            setUnselectedAccounts(unselectedAccounts.filter((item) => item !== account));
        }
    };

    useEffect(() => {
        if (accountInfo?.all_accounts) {
            setAllChecked(batchAccounts.length === accountInfo.all_accounts.length);
        }
    }, [batchAccounts, accountInfo]);

    return (
        <Stack
            gap={6}
            w="full"
            bg="bg.panel"
            rounded="2xl"
            borderWidth="1px"
            borderColor="border.muted"
            p={{ base: 6, md: 8 }}
            my={4}
            animation={`${fadeEntry} 0.4s ease-out`}
            boxShadow="xs"
        >
            <Flex justify="space-between" align="center" mb={2}>
                <Heading size="lg" fontWeight="bold" letterSpacing="tight">
                    {accountInfo?.alias === 'BATCH_RUNNER' ? '\u6279\u91cf\u8fd0\u884c\u914d\u7f6e' : accountInfo?.alias}
                </Heading>
                {accountInfo?.alias !== 'BATCH_RUNNER' && (
                    <Text fontSize="sm" color="fg.muted">
                        {'\u57fa\u7840\u4fe1\u606f\u914d\u7f6e'}
                    </Text>
                )}
            </Flex>

            <form onSubmit={handleSave} autoComplete="off">
                <Stack gap={6}>
                    {accountInfo?.alias !== 'BATCH_RUNNER' && (
                        <>
                            <Field label="账号" required>
                                <Input
                                    name={`autopcr-config-${accountInfo?.alias}-username`}
                                    autoComplete="new-password"
                                    data-lpignore="true"
                                    data-1p-ignore="true"
                                    size="lg"
                                    placeholder={'\u8bf7\u8f93\u5165\u624b\u673a\u53f7\u6216\u8d26\u53f7'}
                                    type="text"
                                    variant="subtle"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </Field>
                            <Field label="密码" required>
                                <Input
                                    name={`autopcr-config-${accountInfo?.alias}-password`}
                                    autoComplete="new-password"
                                    data-lpignore="true"
                                    data-1p-ignore="true"
                                    size="lg"
                                    placeholder={'\u8bf7\u8f93\u5165\u5bc6\u7801'}
                                    type="password"
                                    variant="subtle"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </Field>
                            <Field label="平台" required>
                                <NativeSelect.Root size="lg" variant="subtle">
                                    <NativeSelect.Field
                                        value={channel}
                                        onChange={(e) => setChannel(e.target.value)}
                                    >
                                        {accountInfo?.channel_option.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </NativeSelect.Field>
                                </NativeSelect.Root>
                            </Field>

                            <Button
                                size="lg"
                                colorPalette="blue"
                                loading={isOpen}
                                type="submit"
                                rounded="xl"
                                fontWeight="semibold"
                                mt={2}
                            >
                                {'\u4fdd\u5b58\u914d\u7f6e'}
                            </Button>
                        </>
                    )}

                    {accountInfo?.alias === 'BATCH_RUNNER' && (
                        <Stack gap={5}>
                            <Flex justify="space-between" align="center" bg="bg.subtle" p={3} rounded="xl">
                                <Checkbox
                                    checked={allChecked}
                                    onCheckedChange={onAllCheckedChange}
                                    fontWeight="medium"
                                >
                                    {'\u5168\u9009\u6240\u6709\u8d26\u53f7'}
                                </Checkbox>
                                <Button
                                    size="sm"
                                    colorPalette="blue"
                                    loading={isOpen}
                                    type="submit"
                                    rounded="lg"
                                    px={6}
                                >
                                    {'\u4fdd\u5b58'}
                                </Button>
                            </Flex>

                            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                                <Card.Root variant="subtle" size="sm">
                                    <Card.Header pb={2}>
                                        <Text fontWeight="semibold" color="fg.muted">
                                            {`\u672a\u9009\u62e9\u7684\u8d26\u53f7 (${unselectedAccounts.length})`}
                                        </Text>
                                    </Card.Header>
                                    <Card.Body pt={0} maxH="400px" overflowY="auto">
                                        <VStack align="start" gap={1}>
                                            {unselectedAccounts.map((account) => (
                                                <Checkbox
                                                    key={`unselected-${account}`}
                                                    checked={false}
                                                    onCheckedChange={() => handleAccountToggle(account)}
                                                    w="full"
                                                    p={2}
                                                    rounded="md"
                                                    _hover={{ bg: 'bg.muted' }}
                                                >
                                                    {account}
                                                </Checkbox>
                                            ))}
                                            {unselectedAccounts.length === 0 && (
                                                <Text color="fg.muted" fontSize="sm" py={2}>{'\u65e0'}</Text>
                                            )}
                                        </VStack>
                                    </Card.Body>
                                </Card.Root>

                                <Card.Root variant="outline" borderColor="blue.solid/20" size="sm">
                                    <Card.Header pb={2} bg="blue.subtle/20" borderTopRadius="md">
                                        <Text fontWeight="semibold" color="blue.fg">
                                            {`\u5df2\u9009\u62e9\u7684\u8d26\u53f7 (${batchAccounts.length})`}
                                        </Text>
                                    </Card.Header>
                                    <Card.Body pt={2} maxH="400px" overflowY="auto">
                                        <VStack align="start" gap={1}>
                                            {batchAccounts.map((account) => (
                                                <Checkbox
                                                    key={`selected-${account}`}
                                                    checked={true}
                                                    onCheckedChange={() => handleAccountToggle(account)}
                                                    colorPalette="blue"
                                                    w="full"
                                                    p={2}
                                                    rounded="md"
                                                    _hover={{ bg: 'blue.subtle/10' }}
                                                >
                                                    {account}
                                                </Checkbox>
                                            ))}
                                            {batchAccounts.length === 0 && (
                                                <Text color="fg.muted" fontSize="sm" py={2}>{'\u8bf7\u9009\u62e9\u8d26\u53f7'}</Text>
                                            )}
                                        </VStack>
                                    </Card.Body>
                                </Card.Root>
                            </SimpleGrid>
                        </Stack>
                    )}
                </Stack>
            </form>
        </Stack>
    );
}
