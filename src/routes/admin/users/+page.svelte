<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import {
		Search,
		MoreHorizontal,
		UserX,
		Crown,
		Trash2,
		ShieldCheck,
		Mail
	} from '@lucide/svelte';
	import { cn } from '$lib/utils';

	let { data } = $props();

	let isProModalOpen = $state(false);
	let selectedUserId = $state<string | null>(null);

	let selectedUnit = $state('Months');
	const selectedUnitLabel = $derived(
		['Days', 'Months', 'Years'].find((u) => u === selectedUnit) ?? 'Select unit'
	);

	function isPro(user: any) {
		return user.proExpiration && new Date(user.proExpiration) > new Date();
	}

	function formatDate(date: Date | string | null) {
		if (!date) return '-';
		return new Date(date).toLocaleDateString();
	}
</script>

<svelte:head>
	<title>Users — Ace Blocker Admin</title>
</svelte:head>

<div class="space-y-8">
	<div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h2 class="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
				User Management
			</h2>
			<p class="text-slate-600 dark:text-slate-400">Manage accounts, roles, and licenses.</p>
		</div>

		<form method="GET" class="flex w-full max-w-sm items-center space-x-2">
			<div class="relative w-full">
				<Search class="absolute top-2.5 left-2.5 h-4 w-4 text-slate-500" />
				<Input
					type="text"
					name="search"
					placeholder="Search by name or email..."
					class="pl-9"
					value={page.url.searchParams.get('search') ?? ''}
				/>
			</div>
			<Button type="submit" variant="secondary">Search</Button>
		</form>
	</div>

	<div
		class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0B0B0F]"
	>
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>User</Table.Head>
					<Table.Head>Role</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head>License</Table.Head>
					<Table.Head>Joined</Table.Head>
					<Table.Head class="text-right">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.users as user}
					<Table.Row>
						<Table.Cell>
							<div class="flex flex-col">
								<span class="font-bold text-slate-900 dark:text-white"
									>{user.name}</span
								>
								<span class="flex items-center gap-1 text-xs text-slate-500">
									<Mail class="h-3 w-3" />
									{user.email}
								</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<Badge variant="outline" class="capitalize">{user.role ?? 'user'}</Badge
							>
						</Table.Cell>
						<Table.Cell>
							{#if user.banned}
								<Badge variant="destructive" class="gap-1">
									<UserX class="h-3 w-3" /> Banned
								</Badge>
							{:else}
								<Badge
									variant="secondary"
									class="gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
								>
									<ShieldCheck class="h-3 w-3" /> Active
								</Badge>
							{/if}
						</Table.Cell>
						<Table.Cell>
							{#if isPro(user)}
								<Badge
									class="gap-1 border-brand/20 bg-brand/10 text-brand hover:bg-brand/20"
								>
									<Crown class="h-3 w-3" /> Pro
								</Badge>
							{:else}
								<Badge
									variant="outline"
									class="border-slate-200 text-slate-400 dark:border-slate-800"
									>Free</Badge
								>
							{/if}
						</Table.Cell>
						<Table.Cell class="text-sm text-slate-500">
							{formatDate(user.createdAt)}
						</Table.Cell>
						<Table.Cell class="text-right">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger
									class={cn(
										buttonVariants({ variant: 'ghost', size: 'icon' }),
										'h-8 w-8'
									)}
								>
									<MoreHorizontal class="h-4 w-4" />
									<span class="sr-only">Open menu</span>
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end" class="w-48">
									<DropdownMenu.Label>Actions</DropdownMenu.Label>
									<DropdownMenu.Separator />

									<DropdownMenu.Item
										onSelect={() => {
											selectedUserId = user.id;
											isProModalOpen = true;
										}}
									>
										<Crown class="h-4 w-4 text-brand" />
										Grant Free Pro
									</DropdownMenu.Item>

									<form
										method="POST"
										action="/api/v1/admin/users/toggle-status"
										use:enhance
									>
										<input type="hidden" name="userId" value={user.id} />
										<input
											type="hidden"
											name="isBanned"
											value={user.banned?.toString()}
										/>
										<DropdownMenu.Item>
											<button
												type="submit"
												class="flex w-full items-center gap-2"
											>
												{#if user.banned}
													<ShieldCheck class="h-4 w-4 text-emerald-500" />
													Restore User
												{:else}
													<UserX class="h-4 w-4 text-brand" />
													Ban User
												{/if}
											</button>
										</DropdownMenu.Item>
									</form>

									<DropdownMenu.Separator />

									<form
										method="POST"
										action="/api/v1/admin/users/delete"
										use:enhance
									>
										<input type="hidden" name="userId" value={user.id} />
										<DropdownMenu.Item
											class="focus:text-destructive-foreground text-destructive focus:bg-destructive"
										>
											<button
												type="submit"
												class="flex w-full items-center gap-2"
											>
												<Trash2 class="h-4 w-4" />
												Delete User
											</button>
										</DropdownMenu.Item>
									</form>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>

<Dialog.Root bind:open={isProModalOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Grant Pro License</Dialog.Title>
			<Dialog.Description>
				Select the duration for the manual Pro license override.
			</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="/api/v1/admin/users/grant-pro"
			use:enhance={() => {
				isProModalOpen = false;
			}}
		>
			<input type="hidden" name="userId" value={selectedUserId} />
			<div class="grid gap-4 py-4">
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="duration" class="text-right">Duration</Label>
					<Input
						id="duration"
						name="duration"
						type="number"
						min="1"
						required
						class="col-span-3"
					/>
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="unit" class="text-right">Unit</Label>
					<Select.Root type="single" name="unit" bind:value={selectedUnit}>
						<Select.Trigger class="col-span-3">
							{selectedUnitLabel}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="Days" label="Days">Days</Select.Item>
							<Select.Item value="Months" label="Months">Months</Select.Item>
							<Select.Item value="Years" label="Years">Years</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</div>
			<Dialog.Footer>
				<Button type="submit">Grant Pro</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
