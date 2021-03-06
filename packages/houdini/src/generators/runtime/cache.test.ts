// locals
import { Cache } from './template/cache'

// the type information
const response = {
	rootType: 'Query',
	fields: {
		Query: {
			viewer: { type: 'User', key: 'viewer' },
		},
		User: {
			parent: { type: 'User', key: 'parent' },
			friends: { type: 'User', key: 'friends' },
			id: { type: 'String', key: 'id' },
			firstName: { type: 'String', key: 'firstName' },
			lastName: { type: 'String', key: 'lastName' },
			favoriteColors: { type: 'String', key: 'favoriteColors(where: "foo")' },
		},
	},
}

describe('store', function () {
	test('save root object', function () {
		// instantiate a cache we'll test against
		const cache = new Cache()

		// save the data
		const data = {
			viewer: {
				id: '1',
				firstName: 'bob',
			},
		}
		cache.write(response, data, {})

		// make sure we can get back what we wrote
		expect(cache.get(cache.id('User', data.viewer)).fields).toEqual({ firstName: 'bob' })
	})

	test('partial update existing record', function () {
		// instantiate a cache we'll test against
		const cache = new Cache()

		// save the data
		cache.write(
			response,
			{
				viewer: {
					id: '1',
					firstName: 'bob',
				},
			},
			{}
		)

		cache.write(
			response,
			{
				viewer: {
					id: '1',
					lastName: 'geldof',
				},
			},
			{}
		)

		// make sure we can get back what we wrote
		expect(cache.get(cache.id('User', { id: '1' })).fields).toEqual({
			firstName: 'bob',
			lastName: 'geldof',
		})
	})

	test('linked records with updates', function () {
		// instantiate a cache we'll test against
		const cache = new Cache()

		// save the data
		cache.write(
			response,
			{
				viewer: {
					id: '1',
					firstName: 'bob',
					parent: {
						id: '2',
						firstName: 'jane',
					},
				},
			},
			{}
		)

		// check user 1
		const user1 = cache.get(cache.id('User', { id: '1' }))
		expect(user1.fields).toEqual({
			firstName: 'bob',
		})
		expect(user1.linkedRecord('parent').fields).toEqual({
			firstName: 'jane',
		})

		// check user 2
		const user2 = cache.get(cache.id('User', { id: '2' }))
		expect(user2.fields).toEqual({
			firstName: 'jane',
		})
		expect(user2.linkedRecord('parent')).toBeNull()

		// associate user2 with a new parent
		cache.write(
			response,
			{
				viewer: {
					id: '2',
					firstName: 'jane-prime',
					parent: {
						id: '3',
						firstName: 'mary',
					},
				},
			},
			{}
		)

		// make sure we updated user 2
		expect(user2.fields).toEqual({
			firstName: 'jane-prime',
		})
		expect(user2.linkedRecord('parent').fields).toEqual({
			firstName: 'mary',
		})
	})

	test('linked lists', function () {
		// instantiate the cache
		const cache = new Cache()

		// add some data to the cache
		cache.write(
			response,
			{
				viewer: {
					id: '1',
					firstName: 'bob',
					friends: [
						{
							id: '2',
							firstName: 'jane',
						},
						{
							id: '3',
							firstName: 'mary',
						},
					],
				},
			},
			{}
		)

		// make sure we can get the linked lists back
		const friendData = cache
			.get(cache.id('User', { id: '1' }))
			.linkedList('friends')
			.map(({ fields }) => fields)
		expect(friendData).toEqual([
			{
				firstName: 'jane',
			},
			{
				firstName: 'mary',
			},
		])
	})

	test('list as value with args', function () {
		// instantiate the cache
		const cache = new Cache()

		// add some data to the cache
		cache.write(
			response,
			{
				viewer: {
					id: '1',
					firstName: 'bob',
					favoriteColors: ['red', 'green', 'blue'],
				},
			},
			{}
		)

		// look up the value
		expect(
			cache.get(cache.id('User', { id: '1' })).fields['favoriteColors(where: "foo")']
		).toEqual(['red', 'green', 'blue'])
	})

	test('root subscribe  field change', function () {
		// instantiate a cache
		const cache = new Cache()

		// write some data
		cache.write(
			response,
			{
				viewer: {
					id: '1',
					firstName: 'bob',
					favoriteColors: ['red', 'green', 'blue'],
				},
			},
			{}
		)

		// a function to spy on that will play the role of set
		const set = jest.fn()

		// subscribe to the fields
		cache.subscribe({
			rootType: 'Query',
			selection: {
				viewer: {
					type: 'User',
					key: 'viewer',
					fields: {
						firstName: {
							type: 'String',
							key: 'firstName',
						},
						favoriteColors: {
							type: 'String',
							key: 'favoriteColors(where: "foo")',
						},
					},
				},
			},
			set,
		})

		// somehow write a user to the cache with the same id, but a different name
		cache.write(
			response,
			{
				viewer: {
					id: '1',
					firstName: 'mary',
				},
			},
			{}
		)

		// make sure that set got called with the full response
		expect(set).toHaveBeenCalledWith({
			viewer: {
				firstName: 'mary',
				favoriteColors: ['red', 'green', 'blue'],
			},
		})
	})

	test('root subscribe  linked object changed', function () {
		// instantiate a cache
		const cache = new Cache()

		// start off associated with one object
		cache.write(
			response,
			{
				viewer: {
					id: '1',
					firstName: 'bob',
					favoriteColors: ['red', 'green', 'blue'],
				},
			},
			{}
		)

		// a function to spy on that will play the role of set
		const set = jest.fn()

		// subscribe to the fields
		cache.subscribe({
			rootType: 'Query',
			selection: {
				viewer: {
					type: 'User',
					key: 'viewer',
					fields: {
						firstName: {
							type: 'String',
							key: 'firstName',
						},
						favoriteColors: {
							type: 'String',
							key: 'favoriteColors(where: "foo")',
						},
					},
				},
			},
			set,
		})

		// somehow write a user to the cache with the same id, but a different name
		cache.write(
			response,
			{
				viewer: {
					id: '2',
					firstName: 'mary',
				},
			},
			{}
		)

		// make sure that set got called with the full response
		expect(set).toHaveBeenCalledWith({
			viewer: {
				firstName: 'mary',
				// this is a sanity-check. the cache wasn't written with that value
				favoriteColors: undefined,
			},
		})

		// make sure we are no longer subscribing to user 1
		expect(cache.get(cache.id('User', { id: '1' })).getSubscribers('firstName')).toHaveLength(0)
	})

	test('root subscribe  linked list lost entry', function () {
		// instantiate a cache
		const cache = new Cache()

		// start off associated with one object
		cache.write(
			response,
			{
				viewer: {
					id: '1',
					friends: [
						{
							id: '2',
							firstName: 'jane',
						},
						{
							id: '3',
							firstName: 'mary',
						},
					],
				},
			},
			{}
		)

		// a function to spy on that will play the role of set
		const set = jest.fn()

		// subscribe to the fields
		cache.subscribe({
			rootType: 'Query',
			selection: {
				viewer: {
					type: 'User',
					key: 'viewer',
					fields: {
						firstName: {
							type: 'String',
							key: 'firstName',
						},
						favoriteColors: {
							type: 'String',
							key: 'favoriteColors(where: "foo")',
						},
					},
				},
			},
			set,
		})

		// somehow write a user to the cache with the same id, but a different name
		cache.write(
			response,
			{
				viewer: {
					id: '1',
					friends: [
						{
							id: '2',
						},
					],
				},
			},
			{}
		)

		// make sure that set got called with the full response
		expect(set).toHaveBeenCalledWith({
			viewer: {
				friends: [
					{
						firstName: 'jane',
					},
				],
			},
		})

		// we shouldn't be subscribing to user 3 any more
		expect(cache.get(cache.id('User', { id: '3' })).getSubscribers('firstName')).toHaveLength(0)
	})

	test('root subscribe  linked list reorder', function () {
		// instantiate a cache
		const cache = new Cache()

		// start off associated with one object
		cache.write(
			response,
			{
				viewer: {
					id: '1',
					friends: [
						{
							id: '2',
							firstName: 'jane',
						},
						{
							id: '3',
							firstName: 'mary',
						},
					],
				},
			},
			{}
		)

		// a function to spy on that will play the role of set
		const set = jest.fn()

		// subscribe to the fields
		cache.subscribe({
			rootType: 'Query',
			set,
			selection: {
				viewer: {
					type: 'User',
					key: 'viewer',
					fields: {
						friends: {
							type: 'User',
							key: 'friends',
							fields: {
								firstName: {
									type: 'String',
									key: 'firstName',
								},
							},
						},
					},
				},
			},
		})

		// somehow write a user to the cache with the same id, but a different name
		cache.write(
			response,
			{
				viewer: {
					id: '1',
					friends: [
						{
							id: '3',
						},
						{
							id: '2',
						},
					],
				},
			},
			{}
		)

		// make sure that set got called with the full response
		expect(set).toHaveBeenCalledWith({
			viewer: {
				friends: [
					{
						firstName: 'mary',
					},
					{
						firstName: 'jane',
					},
				],
			},
		})

		// we shouldn't be subscribing to both users
		expect(cache.get(cache.id('User', { id: '2' })).getSubscribers('firstName')).toHaveLength(1)
		expect(cache.get(cache.id('User', { id: '3' })).getSubscribers('firstName')).toHaveLength(1)
	})

	test('unsubscribe', function () {
		// instantiate a cache
		const cache = new Cache()

		// write some data
		cache.write(
			response,
			{
				viewer: {
					id: '1',
					firstName: 'bob',
					favoriteColors: ['red', 'green', 'blue'],
				},
			},
			{}
		)

		// the spec we will register/unregister
		const spec = {
			rootType: 'Query',
			selection: {
				viewer: {
					type: 'User',
					key: 'viewer',
					fields: {
						firstName: {
							type: 'String',
							key: 'firstName',
						},
						favoriteColors: {
							type: 'String',
							key: 'favoriteColors(where: "foo")',
						},
					},
				},
			},
			set: jest.fn(),
		}

		// subscribe to the fields
		cache.subscribe(spec)

		// make sure we  registered the subscriber
		expect(cache.get(cache.id('User', { id: '1' })).getSubscribers('firstName')).toHaveLength(1)

		// unsubscribe
		cache.unsubscribe(spec)

		// make sure there is no more subscriber
		expect(cache.get(cache.id('User', { id: '1' })).getSubscribers('firstName')).toHaveLength(0)
	})

	// atm when we remove subscribers from links we assume its the only reason that spec is associated
	// with the field. that's not the case if the same record shows up two places in a query but is removed
	// as a link in only one of them
	test.todo("removing link doesn't unregister the same set everywhere")
})