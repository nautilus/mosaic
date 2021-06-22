import { parseFile } from './parse'
import '../../../jest.setup'

describe('parser tests', () => {
	test('happy path - separate module and instance script', async () => {
		// parse the string
		const result = await parseFile(`
            <script context="module">
                console.log('module')
            </script>

            <script>
                console.log('instance')
            </script>
        `)

		expect(result.instance?.content).toMatchInlineSnapshot(`console.log("instance");`)
		expect(result.instance?.start).toMatchInlineSnapshot(`112`)
		expect(result.instance?.end).toMatchInlineSnapshot(`181`)

		expect(result.module?.content).toMatchInlineSnapshot(`console.log("module");`)
		expect(result.module?.start).toMatchInlineSnapshot(`13`)
		expect(result.module?.end).toMatchInlineSnapshot(`97`)
	})

	test('happy path - only module', async () => {
		// parse the string
		const result = await parseFile(`
            <script context="module">
                console.log('module')
            </script>
        `)

		expect(result.instance?.content).toMatchInlineSnapshot(`undefined`)
		expect(result.instance?.start).toMatchInlineSnapshot(`undefined`)
		expect(result.instance?.end).toMatchInlineSnapshot(`undefined`)

		expect(result.module?.content).toMatchInlineSnapshot(`console.log("module");`)
		expect(result.module?.start).toMatchInlineSnapshot(`13`)
		expect(result.module?.end).toMatchInlineSnapshot(`97`)
	})

	test('happy path - only instance', async () => {
		// parse the string
		const result = await parseFile(`
            <script>
                console.log('module')
            </script>
        `)

		expect(result.instance?.content).toMatchInlineSnapshot(`console.log("module");`)
		expect(result.instance?.start).toMatchInlineSnapshot(`13`)
		expect(result.instance?.end).toMatchInlineSnapshot(`80`)

		expect(result.module?.content).toMatchInlineSnapshot(`undefined`)
		expect(result.module?.start).toMatchInlineSnapshot(`undefined`)
		expect(result.module?.end).toMatchInlineSnapshot(`undefined`)
	})

	test('single quotes', async () => {
		// parse the string
		const result = await parseFile(`
            <script context='module'>
                console.log('module')
            </script>
        `)

		expect(result.instance?.content).toMatchInlineSnapshot(`undefined`)
		expect(result.instance?.start).toMatchInlineSnapshot(`undefined`)
		expect(result.instance?.end).toMatchInlineSnapshot(`undefined`)

		expect(result.module?.content).toMatchInlineSnapshot(`console.log("module");`)
		expect(result.module?.start).toMatchInlineSnapshot(`13`)
		expect(result.module?.end).toMatchInlineSnapshot(`97`)
	})

	test('happy path - typescript', async () => {
		// parse the string
		const result = await parseFile(`
            <script context="module" lang="ts">
				type Foo = { hello: string}
            </script>
        `)

		expect(result.instance?.content).toMatchInlineSnapshot(`undefined`)
		expect(result.instance?.start).toMatchInlineSnapshot(`undefined`)
		expect(result.instance?.end).toMatchInlineSnapshot(`undefined`)

		expect(result.module?.content).toMatchInlineSnapshot(``)
		expect(result.module?.start).toMatchInlineSnapshot(`13`)
		expect(result.module?.end).toMatchInlineSnapshot(`56`)
	})

	test('nested script block', async () => {
		// parse the string
		const result = await parseFile(`
	        <div>
				<script>
					console.log('non-svelte script block')
				</script>
	        </div>
	    `)

		expect(result.instance?.content).toMatchInlineSnapshot(`undefined`)
		expect(result.instance?.start).toMatchInlineSnapshot(`undefined`)
		expect(result.instance?.end).toMatchInlineSnapshot(`undefined`)

		expect(result.module?.content).toMatchInlineSnapshot(`undefined`)
		expect(result.module?.start).toMatchInlineSnapshot(`undefined`)
		expect(result.module?.end).toMatchInlineSnapshot(`undefined`)
	})
})
