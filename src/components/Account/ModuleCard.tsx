import { Box, Button, Flex, HStack, Tag, Text, VStack } from '@chakra-ui/react'
import { Checkbox } from '../../components/ui/checkbox'
import { FiActivity, FiBarChart2, FiSettings } from 'react-icons/fi'
import { Tooltip } from '../../components/ui/tooltip'
import { ModuleInfo, ConfigValue } from '@interfaces/Module'

interface ModuleCardProps {
    alias: string
    moduleKey?: string
    info: ModuleInfo
    configValue: ConfigValue
    onClick: () => void
    onToggle: (checked: boolean) => void
    onExecute: (e: React.MouseEvent) => void
    onResult: (e: React.MouseEvent) => void
    isRunning?: boolean
}

export default function ModuleCard({ moduleKey, info, configValue, onClick, onToggle, onExecute, onResult, isRunning }: ModuleCardProps) {
    const enabled = !!configValue
    const configCount = info.config_order?.length ?? 0

    const ActionButton = ({
        label,
        icon,
        colorPalette,
        onAction,
        loading = false,
    }: {
        label: string
        icon: React.ReactNode
        colorPalette: string
        onAction: (e: React.MouseEvent) => void
        loading?: boolean
    }) => (
        <Tooltip content={label}>
            <Button
                aria-label={label}
                size="xs"
                variant="ghost"
                colorPalette={colorPalette}
                onClick={onAction}
                loading={loading}
                minW="56px"
                h="46px"
                px={2}
            >
                <VStack gap={0} lineHeight="1">
                    <Box fontSize="14px">{icon}</Box>
                    <Text fontSize="10px" fontWeight="medium">{label}</Text>
                </VStack>
            </Button>
        </Tooltip>
    )

    return (
        <Box
            data-module-card={moduleKey}
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
                    {info.runnable && <ActionButton label={'\u6267\u884c'} icon={<FiActivity />} colorPalette="orange" onAction={onExecute} loading={isRunning} />}
                    {info.runnable && <ActionButton label={'\u7ed3\u679c'} icon={<FiBarChart2 />} colorPalette="green" onAction={onResult} />}
                    <ActionButton label={'\u914d\u7f6e'} icon={<FiSettings />} colorPalette="blue" onAction={(e) => { e.stopPropagation(); onClick(); }} />
                </HStack>
            </Flex>
            {info.description && <Text fontSize="xs" color="fg.muted" mt={2} lineClamp={2}>{info.description}</Text>}
            <Flex justify="space-between" mt={2}>
                <Text fontSize="xs" color="fg.muted">{`${configCount} \u9879\u914d\u7f6e`}</Text>
                <Tag.Root size="sm" colorPalette={enabled ? 'green' : 'gray'} variant="subtle"><Tag.Label>{enabled ? '\u5df2\u542f\u7528' : '\u672a\u542f\u7528'}</Tag.Label></Tag.Root>
            </Flex>
        </Box>
    )
}
