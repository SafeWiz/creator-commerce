import { describe, it, expect } from 'vitest'

import {
    isStaleTestBranch,
    parseCreatedBranch,
    readNeonConfig,
    testBranchName,
} from './neon'

describe('testBranchName', () => {
    it('is test-<user>-<utc timestamp>-<rand>', () => {
        // run
        const name = testBranchName('gimre', new Date('2026-10-07T09:05:03Z'), 'a1b2')

        // assertions
        expect(name).toBe('test-gimre-20261007-090503-a1b2')
    })

    it('reduces the user to lowercase letters, digits and dashes', () => {
        // run
        const name = testBranchName('Gabi O.Brien', new Date('2026-10-07T09:05:03Z'), 'a1b2')

        // assertions
        expect(name).toBe('test-gabi-o-brien-20261007-090503-a1b2')
    })
})

describe('readNeonConfig', () => {
    it('returns the project and parent branch', () => {
        // run
        const config = readNeonConfig({ NEON_PROJECT_ID: 'p-1', NEON_PARENT_BRANCH: 'staging' } as unknown as NodeJS.ProcessEnv)

        // assertions
        expect(config).toEqual({ projectId: 'p-1', parentBranch: 'staging' })
    })

    it('names the missing variable', () => {
        // run + assertions
        expect(() => readNeonConfig({ NEON_PROJECT_ID: 'p-1' } as unknown as NodeJS.ProcessEnv)).toThrow('NEON_PARENT_BRANCH')
        expect(() => readNeonConfig({ NEON_PARENT_BRANCH: 'staging' } as unknown as NodeJS.ProcessEnv)).toThrow('NEON_PROJECT_ID')
    })
})

describe('parseCreatedBranch', () => {
    it('reads the branch and connection uri out of `branches create --output json`', () => {
        // setup
        const json = JSON.stringify({
            branch: { id: 'br-cool-1', name: 'test-x' },
            endpoints: [],
            connection_uris: [{ connection_uri: 'postgres://branch', connection_parameters: {} }],
        })

        // run + assertions
        expect(parseCreatedBranch(json)).toEqual({
            id: 'br-cool-1',
            name: 'test-x',
            connectionUri: 'postgres://branch',
        })
    })

    it('throws on output without a branch id', () => {
        // run + assertions
        expect(() => parseCreatedBranch('{}')).toThrow('branch id')
    })

    it('throws on output without a connection uri', () => {
        // setup
        const json = JSON.stringify({ branch: { id: 'br-cool-1', name: 'test-x' }, connection_uris: [] })

        // run + assertions
        expect(() => parseCreatedBranch(json)).toThrow('connection uri')
    })
})

describe('isStaleTestBranch', () => {
    const now = new Date('2026-10-07T12:00:00Z')
    const threeHours = 3 * 60 * 60 * 1000

    it('is true for an old test- branch', () => {
        // run + assertions
        expect(isStaleTestBranch({ name: 'test-a', created_at: '2026-10-07T08:00:00Z' }, now, threeHours)).toBe(true)
    })

    it('is false for a recent test- branch', () => {
        // run + assertions
        expect(isStaleTestBranch({ name: 'test-a', created_at: '2026-10-07T11:00:00Z' }, now, threeHours)).toBe(false)
    })

    it('is false for any branch not named test-', () => {
        // run + assertions
        expect(isStaleTestBranch({ name: 'staging', created_at: '2020-01-01T00:00:00Z' }, now, threeHours)).toBe(false)
    })
})
