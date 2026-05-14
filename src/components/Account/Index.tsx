import { useEffect, useState } from 'react';

import { AccountResponse } from '@/interfaces/Account';
import Area from './Area';
import { Tabs } from '@chakra-ui/react';
import { getAccount } from '@/api/Account';

export default function Account(alias: string) {
    const [account, setAccount] = useState<AccountResponse | null>(null);

    useEffect(() => {
        if (alias) {
            getAccount(alias).then((res) => {
                setAccount(res);
            }).catch((err) => {
                console.log(err);
            });
        }
    }, [alias]);

    return (
        <Tabs.Root lazyMount variant="enclosed" defaultValue="0">
            <Tabs.List>
                <Tabs.Trigger value="0" disabled>{account?.alias}</Tabs.Trigger>
                {account?.area.map((area, index) => (
                    <Tabs.Trigger key={area.name} value={String(index + 1)}>{area.name}</Tabs.Trigger>
                ))}
            </Tabs.List>

            <Tabs.Content value="0">
                {'\u8bf7\u9009\u62e9\u4e0a\u65b9\u7684\u529f\u80fd\u5206\u533a'}
            </Tabs.Content>

            {account?.area.map((area, index) => (
                <Tabs.Content key={area.key} value={String(index + 1)}>
                    <Area alias={alias} keys={area.key} />
                </Tabs.Content>
            ))}
        </Tabs.Root>
    );
}
