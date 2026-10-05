import { describe, it, expect } from 'vitest'

import { groupBySeller } from './group-by-seller'

describe('groupBySeller', () => {
    it('preserves the order of first appearance', () => {
        // setup
        const rows = [
            { sellerId: 'b', id: 1 },
            { sellerId: 'a', id: 2 },
            { sellerId: 'b', id: 3 },
        ]

        // run
        const groups = groupBySeller(rows)

        // assertions
        expect([...groups.keys()]).toEqual(['b', 'a'])
        expect(groups.get('b')).toEqual([rows[0], rows[2]])
        expect(groups.get('a')).toEqual([rows[1]])
    })

    it('returns an empty map for no rows', () => {
        // run
        const groups = groupBySeller([])

        // assertions
        expect(groups.size).toBe(0)
    })

    it('puts every row in one group when there is one seller', () => {
        // setup
        const rows = [
            { sellerId: 'a', id: 1 },
            { sellerId: 'a', id: 2 },
            { sellerId: 'a', id: 3 },
        ]

        // run
        const groups = groupBySeller(rows)

        // assertions
        expect([...groups.keys()]).toEqual(['a'])
        expect(groups.get('a')).toEqual(rows)
    })

    it('keeps input order within a group', () => {
        // setup
        const rows = [
            { sellerId: 'a', id: 3 },
            { sellerId: 'b', id: 1 },
            { sellerId: 'a', id: 1 },
            { sellerId: 'a', id: 2 },
        ]

        // run
        const groups = groupBySeller(rows)

        // assertions
        expect(groups.get('a')?.map((row) => row.id)).toEqual([3, 1, 2])
    })

    it('groups the original rows, not copies', () => {
        // setup
        const rows = [
            { sellerId: 'a', id: 1 },
            { sellerId: 'b', id: 2 },
        ]

        // run
        const groups = groupBySeller(rows)

        // assertions
        expect(groups.get('a')?.[0]).toBe(rows[0])
        expect(groups.get('b')?.[0]).toBe(rows[1])
    })

    it('leaves the input array untouched', () => {
        // setup
        const rows = [
            { sellerId: 'b', id: 1 },
            { sellerId: 'a', id: 2 },
            { sellerId: 'b', id: 3 },
        ]
        const before = [...rows]

        // run
        groupBySeller(rows)

        // assertions
        expect(rows).toEqual(before)
    })

    it('accounts for every row exactly once', () => {
        // setup
        const rows = [
            { sellerId: 'c', id: 1 },
            { sellerId: 'a', id: 2 },
            { sellerId: 'c', id: 3 },
            { sellerId: 'b', id: 4 },
            { sellerId: 'a', id: 5 },
        ]

        // run
        const groups = groupBySeller(rows)

        // assertions
        const flattened = [...groups.values()].flat()
        expect(flattened).toHaveLength(rows.length)
        expect(new Set(flattened)).toEqual(new Set(rows))
    })

    it('treats seller ids as exact strings', () => {
        // setup
        const rows = [
            { sellerId: 'abc', id: 1 },
            { sellerId: 'ABC', id: 2 },
            { sellerId: 'abc ', id: 3 },
        ]

        // run
        const groups = groupBySeller(rows)

        // assertions
        expect(groups.size).toBe(3)
    })
})
