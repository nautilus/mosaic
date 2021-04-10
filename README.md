<div align="center">
  <img alt="houdini" height="200" src=".github/assets/houdini-v5.png" />

  <br />
  <br />

  <strong>
	The disappearing GraphQL client for Sapper.
  </strong>
  <br />
  <br />
</div>

NOTE: Houdini is in the early phases of development. Please create an issue or start a discussion if you run into problems. For more information on what's coming for this project, you can visit the 
[roadmap](https://github.com/AlecAivazis/houdini/projects/1).

If you are interested in helping out, please reach out to @AlecAivazis on the Svelte discord. There's lots to do regardless of how deep you might want to dive 🙂
 

## ✨&nbsp;&nbsp;Features

-   Composable and colocated data requirements for your components
-   Normalized cache with declarative updates
-   Sapper ready. Sveltekit support once it stabilizes.
-   Generated types
-   Customizable error handling (coming soon)

At its core, houdini seeks to enable a high quality developer experience
without compromising bundle size. Like Svelte, houdini shifts what is
traditionally handled by a bloated runtime into a compile step that allows
for the generation of an incredibly lean GraphQL abstraction for your application.

## 📚&nbsp;&nbsp;Table of Contents

1. [Example](#example)
1. [Installation](#installation)
1. [Configuring Your Application](#configuring-your-application)
1. [Running the Compiler](#running-the-compiler)
1. [Fetching Data](#fetching-data)
    1. [Query variables and page data](#query-variables-and-page-data)
    1. [What about preload?](#what-about-preload)
1. [Fragments](#fragments)
1. [Mutations](#mutations)
    1. [Updating fields](#updating-fields)
    1. [Connections](#connections)
        1. [Insert](#inserting-a-record)
        1. [Remove](#removing-a-record)
        1. [Delete](#deleting-a-record)
        1. [Conditionals](#conditionals)
1. [Subscriptions](#subscriptions)
    1. [Configuring the WebSocket client](#configuring-the-websocket-client)
    1.  [Using graphql-ws](#configuring-the-websocket-client)
    1. [Using subscriptions-transport-ws](#using-subscriptions-transport-ws)
1. [Authentication](#authentication)
1. [Notes, Constraints, and Conventions](#%EF%B8%8Fnotes-constraints-and-conventions)

## 🕹️&nbsp;&nbsp;Example

A demo can be found in the <a href='./example'>example directory</a>.

Please note that the examples in that directory and this readme showcase the typescript definitions
generated by the compiler. While it is highly recommended, Typescript is NOT required in order to use houdini.

## ⚡&nbsp;&nbsp;Installation

houdini is available on npm:

```sh
yarn add -D houdini houdini-preprocess
# or
npm install --save-dev houdini houdini-preprocess
```

## 🔧&nbsp;&nbsp;Configuring Your Application

Adding houdini to an existing sapper project can easily be done with the provided command-line tool.
If you don't already have an existing app, visit [this link](https://sapper.svelte.dev/docs#Getting_started)
for help setting one up. Once you have a project and want to add houdini, execute the following command:

```sh
npx houdini init
```

This will create a few necessary files, as well as pull down a json representation of
your API's schema. Next, add the preprocessor to your sapper setup. Don't
forget to add it to both the client and the server configurations!

```typescript
import houdini from 'houdini-preprocess'

// somewhere in your config file
{
    plugins: [
        svelte({
            preprocess: [houdini()],
        }),
    ]
}
```

With that in place, the only thing left is to configure your client and server environments
to use the generated starting point for your network layer:

```typescript
// in both src/client.js and src/server.js

import { setEnvironment } from '$houdini'
import env from './environment'

setEnvironment(env)
```



## <img src="./.github/assets/cylon.gif" height="28px" />&nbsp;&nbsp;Running the Compiler

The compiler is responsible for a number of things, ranging from generating the actual runtime
to creating types for your documents. Running the compiler can be done with npx or via a script
in `package.json` and needs to be run every time a GraphQL document in your source code changes:

```sh
npx houdini generate
```

The generated runtime can be accessed by importing `$houdini` anywhere in your application.

## 🚀&nbsp;&nbsp;Fetching Data

Grabbing data from your API is done with the `query` function:

```svelte
<script lang="ts">
    import { query, graphql, AllItems } from '$houdini'

    // load the items
    const { data } = query<AllItems>(graphql`
        query AllItems {
            items {
                id
                text
            }
        }
    `)
</script>

{#each $data.items as item}
    <div>{item.text}</div>
{/each}
```

### Query variables and page data

At the moment, query variables are declared as a function in the module context of your component.
This function must be named after your query and takes the same `page` and `session` arguments
that are given to the `preload` function described in the [Sapper](https://sapper.svelte.dev/docs#Pages)
documentation. Here is a modified example from the [demo](./example):

```svelte
// src/routes/[filter].svelte

<script lang="ts">
    import { query, graphql, AllItems } from '$houdini'

    // load the items
    const { data } = query<AllItems>(graphql`
        query AllItems($completed: Boolean) {
            items(completed: $completed) {
                id
                text
            }
        }
    `)
</script>

<script context="module" lang="ts">
    // This is the function for the AllItems query.
    // Query variable functions must be named <QueryName>Variables.
    export function AllItemsVariables(page): AllItems$input {
        // make sure we recognize the value
        if (!['active', 'completed'].includes(page.params.filter)) {
            this.error(400, "filter must be one of 'active' or 'completed'")
            return
        }

        return {
            completed: page.params.filter === 'completed',
        }
    }
</script>

{#each $data.items as item}
    <div>{item.text}</div>
{/each}
```

### What about `preload`?

Don't worry - that's where the preprocessor comes in. One of its responsibilities is moving the actual
fetch into a `preload`. You can think of the block at the top of this section as equivalent to:

```svelte
<script context="module">
    export async function preload() {
            return {
                _data: await this.fetch({
                    text: `
                        query AllItems {
                            items {
                                id
                                text
                            }
                        }
                    `
                }),
            }
    }
</script>

<script>
    export let _data

    const data = readable(_data, ...)
</script>

{#each $data.items as item}
    <div>{item.text}</div>
{/each}
```

## 🧩&nbsp;&nbsp;Fragments

Your components will want to make assumptions about which attributes are
available in your queries. To support this, Houdini uses GraphQL fragments embedded
within your component. Take, for example, a `UserAvatar` component that requires
the `profilePicture` field of a `User`:

```svelte
// components/UserAvatar.svelte

<script lang="ts">
    import { fragment, graphql, UserAvatar } from '$houdini'

    // the reference will get passed as a prop
    export let user: UserAvatar

    const data = fragment(graphql`
        fragment UserAvatar on User {
            profilePicture
        }
    `, user)
</script>

<img src={$data.profilePicture} />
```

This component can be rendered anywhere we want to query for a user, with a guarantee
that all necessary data has been asked for:

```svelte
// src/routes/users.svelte

<script>
    import { query, graphql, AllUsers } from '$houdini'
    import { UserAvatar } from 'components'

    const { data } = query<AllUsers>(graphql`
        query AllUsers {
            users {
                id
                ...UserAvatar
            }
        }
    `)
</script>

{#each $data.users as user}
    <UserAvatar user={user} />
{/each}
```

It's worth mentioning explicitly that a component can rely on multiple fragments
at the same time so long as the fragment names are unique and prop names are different.

## 📝&nbsp;&nbsp;Mutations

Mutations are defined in your component like the rest of the documents but
instead of triggering a network request when called, you get a function
which can be invoked to execute the mutation. Here's another modified example from
[the demo](./example):

```svelte
<script lang="ts">
    import { mutation, graphql, UncheckItem } from '$houdini'

    let itemID: string

    const uncheckItem = mutation<UncheckItem>(graphql`
        mutation UncheckItem($id: ID!) {
            uncheckItem(item: $id) {
                item {
                    id
                    completed
                }
            }
        }
    `)
</script>

<button on:click={() => uncheckItem({ id: itemID })}>
    Uncheck Item
</button>
```

Note: mutations usually do best when combined with at least one fragment grabbing
the information needed for the mutation (for an example of this pattern, see below.)

### Updating fields

When a mutation is responsible for updating fields of entities, houdini
should take care of the details for you as long as you request the updated data alongside the
record's id. Take for example, an `TodoItemRow` component:

```svelte
<script lang="ts">
    import { fragment, mutation, graphql, TodoItemRow } from '$houdini'

    export let item: TodoItemRow

    // the resulting store will stay up to date whenever `checkItem`
    // is triggered
    const data = fragment(
        graphql`
            fragment TodoItemRow on TodoItem {
                id
                text
                completed
            }
        `,
        item
    )

    const checkItem = mutation<CompleteItem>(graphql`
        mutation CompleteItem($id: ID!) {
            checkItem(item: $id) {
                item {
                    id
                    completed
                }
            }
        }
    `)
</script>

<li class:completed={$data.completed}>
    <input
        name={$data.text}
        class="toggle"
        type="checkbox"
        checked={$data.completed}
        on:click={handleClick}
    />
    <label for={$data.text}>{$data.text}</label>
    <button class="destroy" on:click={() => deleteItem({ id: $data.id })} />
</li>
```

### Connections

Adding and removing records from a list is done by mixing together a few different generated fragments
and directives. In order to tell the compiler which lists are targets for these operations, you have to
mark them with the `@connection` directive and provide a unique name:

```graphql
query AllItems {
    items @connection(name: "All_Items") {
        id
    }
}
```

It's recommended to name these connections with a different casing convention than the rest of your
application to distinguish the generated fragments from those in your codebase.

#### Inserting a record

With this field tagged, any mutation that returns an `Item` can be used to insert items in this list:

```graphql
mutation NewItem($input: AddItemInput!) {
    addItem(input: $input) {
        ...All_Items_insert
    }
}
```

#### Removing a record

Any mutation that returns an `Item` can also be used to remove an item from the connection:

```graphql
mutation RemoveItem($input: RemoveItemInput!) {
    removeItem(input: $input) {
        ...All_Items_remove
    }
}
```

#### Deleting a record

Sometimes it can be tedious to remove a record from every single connection that mentions it.
For these situations, Houdini provides a directive that can be used to mark a field in
the mutation response holding the ID of a record to delete from all connections.

```graphql
mutation DeleteItem($id: ID!) {
    deleteItem(id: $id) {
        itemID @Item_delete
    }
}
```

#### Conditionals

Sometimes you only want to add or remove a record from a connection when an argument has a particular value.
For example, in a todo list you might only want to add the result to the list if there is no filter being
applied. To support this, houdini provides the `@when` and `@when_not` directives:

```graphql
mutation NewItem($input: AddItemInput!) {
    addItem(input: $input) {
        ...All_Items_insert @when_not(argument: "completed", value: "true")
    }
}
```

## 🧾&nbsp;&nbsp;Subscriptions

Subscriptions in houdini are handled with the `subscription` function exported by your runtime. This function 
takes a tagged document, and returns a store with the most recent value returned by the server. Keep in mind
that houdini will keep the cache (and any subscribing components) up to date as new data is encountered.

Here is an example from the demo todo list: 

```svelte
<script lang="ts">
	import {
		fragment,
		mutation,
		graphql,
		subscription,
        ItemEntry_item,
	} from '$houdini'

	// the reference we're passed from our parents
	export let item: ItemEntry_item

	// get the information we need about the item
	const data = fragment(/* ... */)

	// since we're just using subscriptions to stay up to date, we don't care about the return value
	subscription(
		graphql`
			subscription ItemUpdate($id: ID!) {
				itemUpdate(id: $id) {
					item {
						id
						completed
						text
					}
				}
			}
		`,
		{
			id: $data.id,
		}
	)
</script>

<li class:completed={$data.completed}>
	<div class="view">
		<input
			name={$data.text}
			class="toggle"
			type="checkbox"
			checked={$data.completed}
			on:click={handleClick}
		/>
		<label for={$data.text}>{$data.text}</label>
		<button class="destroy" on:click={() => deleteItem({ id: $data.id })} />
	</div>
</li>
```

### Configuring the WebSocket client

Houdini can work with any websocket client as long as you can provide an object that satisfies
the `SubscriptionHandler` interface as the second argument to the Environment's constructor. Keep in mind
that WebSocket connections only exist between the browser and your API, therefor you must remember to 
pass `null` when configuring your environment on the rendering server. 

If your API supports the [`graphql-ws`](https://github.com/enisdenjo/graphql-ws) protocol, you can create a 
client and pass it directly: 

```typescript
// environment.ts

import { createClient } from 'graphql-ws'

let socketClient = (process as any).browser
	? new createClient({
			url: 'ws://api.url',
	  })
	: null

export default new Environment(fetchQuery, socketClient)
```


#### Using `subscriptions-transport-ws`

If you are using the deprecated `subscriptions-transport-ws` library and associated protocol, 
you will have to slightly modify the above block:


```typescript
// environment.ts

import { SubscriptionClient } from 'subscriptions-transport-ws'

let socketClient: SubscriptionHandler | null = null
if ((process as any).browser) {
	// instantiate the transport client
	const client = new SubscriptionClient('ws://api.url', {
		reconnect: true,
	})

	// wrap the client in something houdini can use
	socketClient = {
		subscribe(payload, handlers) {
			// send the request
			const { unsubscribe } = client.request(payload).subscribe(handlers)

			// return the function to unsubscribe
			return unsubscribe
		},
	}
}

export default new Environment(fetchQuery, socketClient)
```

## 🔐&nbsp;&nbsp;Authentication

houdini defers to Sapper's sessions for authentication. Assuming that the session has been populated 
somehow, you can access it through the second argument in the environment definition:

```typescript
//src/environment.ts

import { Environment } from '$houdini'

// this function can take a second argument that will contain the session
// data during a request or mutation
export default new Environment(async function ({ text, variables = {} }, session) {
    const result = await this.fetch('http://localhost:4000', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': session.token ? `Bearer ${session.token}` : null,
        },
        body: JSON.stringify({
            query: text,
            variables,
        }),
    })

    // parse the result as json
    return await result.json()
})
```

## ⚠️&nbsp;&nbsp;Notes, Constraints, and Conventions
- The compiler must be run every time the contents of a `graphql` tagged string changes
- Every GraphQL Document must have a name that is unique
- Variable functions must be named after their query
- Documents with a query must have only one operation in them
- Documents without an operation must have only one fragment in them
