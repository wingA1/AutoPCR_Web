import { DataCenterPage } from '@routes/daily/_sidebar/datacenter/index'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/daily/_sidebar/account/')({
    component: DataCenterPage,
})
