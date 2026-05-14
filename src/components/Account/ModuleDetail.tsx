import { Box, Button, Flex, HStack, Stack, Tag, Text } from '@chakra-ui/react'
import { FiArrowLeft, FiActivity } from 'react-icons/fi'
import { ModuleInfo, ConfigValue } from '@interfaces/Module'
import Config from './Config'

interface ModuleDetailProps {
    alias: string
    info: ModuleInfo
    config: Record<string, ConfigValue>
    onBack: () => void
    onExecute: () => void
    onResult: () => void
    isRunning: boolean
}

export default function ModuleDetail({ alias, info, config, onBack, onExecute, onResult, isRunning }: ModuleDetailProps) {
    return (
        <Box>
            <Flex align="center" gap={3} mb={4}>
                <Button size="sm" variant="ghost" onClick={onBack}><FiArrowLeft /> {'\u8fd4\u56de\u6a21\u5757'}</Button>
                <Text fontWeight="bold" fontSize="lg">{info.name}</Text>
                {info.tags?.map((tag) => (<Tag.Root key={tag} size="sm" colorPalette="gray" variant="subtle"><Tag.Label>{tag}</Tag.Label></Tag.Root>))}
                <HStack ml="auto" gap={2}>
                    {info.runnable && <Button size="sm" colorPalette="orange" variant="surface" loading={isRunning} onClick={onExecute}><FiActivity /> {'\u6267\u884c'}</Button>}
                    {info.runnable && <Button size="sm" colorPalette="green" variant="ghost" onClick={onResult}><FiActivity /> {'\u7ed3\u679c'}</Button>}
                </HStack>
            </Flex>
            {info.description && <Box bg="bg.subtle" p={3} borderRadius="md" fontSize="sm" color="fg.muted" mb={4}>{info.description}</Box>}
            {info.config_order.length > 0 && (
                <Stack gap={4}>
                    <Text fontSize="sm" fontWeight="semibold" color="fg.subtle">{'\u914d\u7f6e\u9879'}</Text>
                    {info.config_order.map((key) => (
                        <Config key={key} alias={alias} value={config[key]} info={info.config[key]} />
                    ))}
                </Stack>
            )}
        </Box>
    )
}
