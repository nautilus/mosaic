// @ts-ignore: file doesn't exist yet
import type { Environment } from './environment'

export type FetchParams = {
	text: string
	variables: { [key: string]: any }
}

export type FetchContext = {
	fetch: typeof window.fetch
	error: (code: number, mesage: string | Error) => void
	redirect: (statusCode: number, location: string) => void
}

export type FetchSession = any

type GraphQLError = {
	message: string
}

type RequestPayload = { data: any; errors?: Error[] }

export type RequestHandler = (
	this: FetchContext,
	params: FetchParams,
	session?: FetchSession
) => Promise<RequestPayload>

// fetchQuery is used by the preprocess-generated runtime to send an operation to the server
export async function fetchQuery(
	ctx: FetchContext,
	{
		text,
		variables,
	}: {
		text: string
		variables: { [name: string]: unknown }
	},
	session?: FetchSession
) {
	// grab the current environment
	const environment = getEnvironment()
	// if there is no environment
	if (!environment) {
		return { data: {}, errors: [{ message: 'could not find houdini environment' }] }
	}

	return await environment.sendRequest(ctx, { text, variables }, session)
}

let currentEnv: Environment | null = null

export function setEnvironment(env: Environment) {
	currentEnv = env
}

export function getEnvironment(): Environment | null {
	return currentEnv
}

export class RequestContext implements FetchContext {
	_ctx: FetchContext
	continue: boolean

	constructor(ctx: FetchContext) {
		this._ctx = ctx
		this.continue = true
	}

	error(statusCode: number, message: string | Error) {
		this.continue = false
		return this._ctx.error(statusCode, message)
	}

	redirect(statusCode: number, location: string) {
		this.continue = false
		return this._ctx.redirect(statusCode, location)
	}

	fetch(input: RequestInfo, init?: RequestInit) {
		return this._ctx.fetch(input, init)
	}

	graphqlErrors(errors: GraphQLError[]) {
		this._ctx.error(500, errors.map(({ message }) => message).join('\n'))
		return
	}
}

export type SubscriptionHandler = {
	subscribe: (
		payload: { query: string },
		handlers: { next: (data: {}) => void; error: (data: {}) => void; complete: () => void }
	) => () => void
}
