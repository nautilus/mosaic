// external imports
import * as recast from 'recast'
import path from 'path'
import { testConfig } from 'houdini-common'
import * as graphql from 'graphql'
import fs from 'fs/promises'
import mockFs from 'mock-fs'
import { ProgramKind } from 'ast-types/gen/kinds'
import * as typeScriptParser from 'recast/parsers/typescript'

// local imports
import runGenerators from '.'
import { CollectedGraphQLDocument } from '../types'

// define the schema
const config = testConfig()

beforeEach(() => {
	mockFs({
		[config.runtimeDirectory]: {
			[config.artifactDirectory]: {},
			[config.interactionDirectory]: {},
		},
		// make sure that the snapshots are loadable
		[__dirname]: {
			__snapshots__: mockFs.load(path.resolve(__dirname, '__snapshots__')),
		},
	})
})

// make sure the runtime directory is clear before each test
afterEach(mockFs.restore)

test('generates cache updaters', async function () {
	// the documents to test
	const docs: CollectedGraphQLDocument[] = [
		// the query needs to ask for a field that the mutation could update
		{
			name: 'TestQuery',
			document: graphql.parse(`query TestQuery { user { id firstName } }`),
		},
		{
			name: 'TestMutation',
			document: graphql.parse(`mutation TestMutation { updateUser { id firstName } }`),
		},
	]

	// run the generators
	await runGenerators(config, docs)

	// look up the files in the mutation directory
	const files = await fs.readdir(config.interactionDirectory)

	// make sure we made two files
	expect(files).toHaveLength(1)
	// and they have the right names
	expect(files).toEqual(
		expect.arrayContaining([
			path.basename(config.interactionPath({ query: 'TestQuery', mutation: 'TestMutation' })),
		])
	)

	// load the contents of the file
	const contents = await fs.readFile(
		config.interactionPath({ query: 'TestQuery', mutation: 'TestMutation' }),
		'utf-8'
	)

	// make sure there is something
	expect(contents).toBeTruthy()

	// parse the contents
	const parsedContents: ProgramKind = recast.parse(contents, {
		parser: typeScriptParser,
	}).program
	// sanity check
	expect(parsedContents.type).toBe('Program')

	// make sure this doesn't change without approval
	expect(parsedContents).toMatchSnapshot()
})

test.skip('inline fragments in mutation body count as an intersection', function () {})

test.skip('inline fragments in queries count as an intersection', function () {})

test.skip('inline fragments in fragments count as an intersection', function () {})

test.skip('fragment spread in mutation body', function () {})

test.skip("nested objects that don't have id should also update", function () {})
