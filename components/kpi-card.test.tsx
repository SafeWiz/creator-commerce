import { describe, it, expect } from 'vitest'
import { render } from 'vitest-browser-react'

import { KpiCard } from './kpi-card'

describe('KpiCard', () => {
    it('renders the label, value, sub and badge', async () => {
        // run
        const screen = await render(
            <KpiCard
                label="Revenue"
                value="$1,240.00"
                sub="last 30 days"
                badge={{ label: '+12%', variant: 'default' }}
            />,
        )

        // assertions
        await expect.element(screen.getByText('Revenue')).toBeInTheDocument()
        await expect.element(screen.getByText('$1,240.00')).toBeInTheDocument()
        await expect.element(screen.getByText('last 30 days')).toBeInTheDocument()
        await expect.element(screen.getByText('+12%')).toBeInTheDocument()
    })
})
