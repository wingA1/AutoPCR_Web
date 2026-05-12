import { Box, Flex, HStack, Tag, Text } from '@chakra-ui/react'
import { Checkbox } from '../../components/ui/checkbox'
import { FiActivity, FiSettings } from 'react-icons/fi'
import { IconButton } from '../../components/ui/icon-button'
import { Tooltip } from '../../components/ui/tooltip'
import { ModuleInfo, ConfigValue } from '@interfaces/Module'

interface ModuleCardProps {
    alias: string
    info: ModuleInfo
    configValue: ConfigValue
    onClick: () => void
    onToggle: (checked: boolean) => void
    onExecute: (e: React.MouseEvent) => void
    onResult: (e: React.MouseEvent) => void
    isRunning?: boolean
}

export default function ModuleCard({ info, configValue, onClick, onToggle, onExecute, onResult, isRunning }: ModuleCardProps) {
    const enabled = !!configValue
    const configCount = info.config_order?.length ?? 0
    return (
        <Box
            bg="bg.panel"
            borderWidth="1px"
            borderColor={enabled ? 'blue.200' : 'border.subtle'}
            borderRadius="lg"
            p={3}
            cursor="pointer"
            transition="all 0.15s"
            _hover={{ borderColor: 'blue.300', shadow: 'sm' }}
            onClick={onClick}
        >
            <Flex justify="space-between" align="start" gap={2}>
                <HStack gap={2} flex={1} minW={0} onClick={(e) => e.stopPropagation()}>
                    <Checkbox size="sm" checked={enabled} onCheckedChange={(e) => onToggle(!!e.checked)} colorPalette="blue" />
                    <Box minW={0} flex={1}>
                        <HStack gap={1} flexWrap="wrap">
                            <Text fontWeight="bold" fontSize="sm" truncate>{info.name}</Text>
                            {info.tags?.slice(0, 2).map((tag) => (
                                <Tag.Root key={tag} size="sm" colorPalette="gray" variant="subtle"><Tag.Label>{tag}</Tag.Label></Tag.Root>
                            ))}
                        </HStack>
                    </Box>
                </HStack>
                <HStack gap={0} flexShrink={0} onClick={(e) => e.stopPropagation()}>
                    {info.runnable && <Tooltip content="执行"><IconButton aria-label="Execute" size="sm" variant="ghost" colorPalette="orange" onClick={onExecute} loading={isRunning}><FiActivity /></IconButton></Tooltip>}
                    {info.runnable && <Tooltip content="结果"><IconButton aria-label="Result" size="sm" variant="ghost" colorPalette="green" onClick={onResult}><FiActivity /></IconButton></Tooltip>}
                    <Tooltip content="配置"><IconButton aria-label="Config" size="sm" variant="ghost" colorPalette="blue" onClick={onClick}><FiSettings /></IconButton></Tooltip>
                </HStack>
            </Flex>
            {info.description && <Text fontSize="xs" color="fg.muted" mt={2} lineClamp={2}>{info.description}</Text>}
            <Flex justify="space-between" mt={2}>
                <Text fontSize="xs" color="fg.muted">{configCount} 项配置</Text>
                <Tag.Root size="sm" colorPalette={enabled ? 'green' : 'gray'} variant="subtle"><Tag.Label>{enabled ? '已启用' : '未启用'}</Tag.Label></Tag.Root>
            </Flex>
        </Box>
    )
}
