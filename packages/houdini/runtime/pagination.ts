// externals
import { Readable } from 'svelte/store'
// locals
import { Operation, GraphQLTagResult, Fragment } from './types'
import { query, QueryResponse } from './query'
import { getVariables } from './context'
import { fragment } from './fragment'

type PaginatedQueryResponse<_Data, _Input> = {
	data: Readable<_Data>
	loadNextPage(pageCount?: number): Promise<void>
} & QueryResponse<_Data, _Input>

export function paginatedQuery<_Query extends Operation<any, any>>(
	document: GraphQLTagResult
): PaginatedQueryResponse<_Query['result'], _Query['input']> {
	// pass the artifact to the base query operation
	const { data, ...restOfQueryResponse } = query(document)

	// if there's no refetch config for the artifact there's a problem
	if (!document.artifact.refetch) {
		throw new Error('paginatedQuery must be passed a query with @paginate.')
	}

	// hold onto the current value
	let value: _Query['result']
	data.subscribe((val) => {
		value = val
	})
	const variables = getVariables()
	const loadNextPage = async () => {
		console.log(variables())
	}

	return { data, loadNextPage, ...restOfQueryResponse }
}