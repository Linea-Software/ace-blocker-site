<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { apiClient } from '$lib/api-client';
	import { Badge } from '$lib/components/ui/badge';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import * as m from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';
	import {
		Gauge,
		Mail,
		MoreHorizontal,
		Search,
		ShieldCheck,
		Trash2,
		UserCog,
		Users,
		UserX
	} from '@lucide/svelte';

	let { data } = $props();

	let isProModalOpen = $state(false);
	let selectedUser = $state<{ id: string; name: string } | null>(null);
	let selectedUnit = $state('Months');
	let isGrantingPro = $state(false);
	let pendingUserId = $state<string | null>(null);

	const selectedUnitLabel = $derived(
		[
			{ value: 'Days', label: m.admin_users_days() },
			{ value: 'Months', label: m.admin_users_months() },
			{ value: 'Years', label: m.admin_users_years() }
		].find((unit) => unit.value === selectedUnit)?.label ?? m.admin_users_select_unit()
	);

	const summaryStats = $derived([
		{ label: m.admin_users_total(), value: data.summary.total, icon: Users },
		{ label: m.admin_users_active(), value: data.summary.active, icon: ShieldCheck },
		{ label: m.admin_users_pro(), value: data.summary.pro, icon: Gauge },
		{ label: m.admin_users_admins(), value: data.summary.admins, icon: UserCog }
	]);

	function isPro(user: { proExpiration?: Date | string | null }) {
		return Boolean(user.proExpiration && new Date(user.proExpiration) > new Date());
	}

	function formatDate(date: Date | string | null) {
		if (!date) return '—';
		return new Date(date).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function errorMessage(response: unknown): string {
		if (
			typeof response === 'object' &&
			response !== null &&
			'error' in response &&
			typeof response.error === 'object' &&
			response.error !== null &&
			'message' in response.error
		) {
			return String(response.error.message);
		}
		return m.admin_users_action_failed();
	}

	async function toggleStatus(user: { id: string; banned: boolean | null }) {
		pendingUserId = user.id;
		const response = await apiClient.v1.admin.users['toggle-status'].post({
			userId: user.id,
			isBanned: Boolean(user.banned)
		});
		pendingUserId = null;

		if (response.error) {
			alert(errorMessage(response));
			return;
		}
		await invalidateAll();
	}

	async function deleteUser(userId: string) {
		pendingUserId = userId;
		const response = await apiClient.v1.admin.users.delete.post({ userId });
		pendingUserId = null;

		if (response.error) {
			alert(errorMessage(response));
			return;
		}
		await invalidateAll();
	}

	async function grantPro(event: SubmitEvent) {
		event.preventDefault();
		if (!selectedUser) return;

		isGrantingPro = true;
		const formData = new FormData(event.currentTarget as HTMLFormElement);
		const response = await apiClient.v1.admin.users['grant-pro'].post({
			userId: selectedUser.id,
			duration: formData.get('duration'),
			unit: selectedUnit
		});
		isGrantingPro = false;

		if (response.error) {
			alert(errorMessage(response));
			return;
		}

		isProModalOpen = false;
		selectedUser = null;
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>{m.admin_users_page_title()}</title>
</svelte:head>

<div class="flex flex-col gap-8">
	<header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
				<UserCog aria-hidden="true" />
				{m.admin_users_eyebrow()}
			</div>
			<div>
				<h2 class="font-display text-3xl font-semibold">{m.admin_users_title()}</h2>
				<p class="mt-1 max-w-2xl text-muted-foreground">{m.admin_users_description()}</p>
			</div>
		</div>

		<form method="GET" class="flex w-full gap-2 lg:max-w-md">
			<Label for="user-search" class="sr-only">{m.admin_users_search_label()}</Label>
			<Input
				id="user-search"
				type="search"
				name="search"
				placeholder={m.admin_users_search_placeholder()}
				value={page.url.searchParams.get('search') ?? ''}
			/>
			<Button type="submit" variant="secondary">
				<Search data-icon="inline-start" aria-hidden="true" />
				{m.admin_users_search_action()}
			</Button>
		</form>
	</header>

	<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={m.admin_users_summary()}>
		{#each summaryStats as stat (stat.label)}
			<Card.Root class="gap-4 py-5">
				<Card.Header class="flex-row items-center justify-between px-5">
					<Card.Title class="text-sm font-medium text-muted-foreground"
						>{stat.label}</Card.Title
					>
					<div class="flex size-9 items-center justify-center rounded-lg bg-muted">
						<stat.icon class="size-4" aria-hidden="true" />
					</div>
				</Card.Header>
				<Card.Content class="px-5">
					<p class="font-display text-3xl font-semibold">{stat.value.toLocaleString()}</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</section>

	<Card.Root class="overflow-hidden">
		<Card.Header class="border-b">
			<Card.Title>{m.admin_users_directory_title()}</Card.Title>
			<Card.Description>
				{page.url.searchParams.get('search')
					? m.admin_users_search_results({ count: data.users.length })
					: m.admin_users_directory_description({ count: data.users.length })}
			</Card.Description>
		</Card.Header>
		<Card.Content class="p-0">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>{m.admin_users_column_user()}</Table.Head>
							<Table.Head>{m.admin_users_column_role()}</Table.Head>
							<Table.Head>{m.admin_users_column_status()}</Table.Head>
							<Table.Head>{m.admin_users_column_license()}</Table.Head>
							<Table.Head>{m.admin_users_column_joined()}</Table.Head>
							<Table.Head class="text-right"
								>{m.admin_users_column_actions()}</Table.Head
							>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.users as user (user.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex min-w-52 flex-col">
										<span class="font-medium">{user.name}</span>
										<span
											class="flex items-center gap-1 text-xs text-muted-foreground"
										>
											<Mail class="size-3" aria-hidden="true" />
											{user.email}
										</span>
									</div>
								</Table.Cell>
								<Table.Cell>
									<Badge variant="outline" class="capitalize"
										>{user.role ?? m.admin_users_user_role()}</Badge
									>
								</Table.Cell>
								<Table.Cell>
									{#if user.banned}
										<Badge variant="destructive">
											<UserX aria-hidden="true" />
											{m.admin_users_banned()}
										</Badge>
									{:else}
										<Badge variant="secondary">
											<ShieldCheck aria-hidden="true" />
											{m.admin_users_active()}
										</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell>
									{#if isPro(user)}
										<Badge>
											<Gauge aria-hidden="true" />
											{m.admin_users_pro()}
										</Badge>
									{:else}
										<Badge variant="outline">{m.admin_users_free()}</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-sm text-muted-foreground"
									>{formatDate(user.createdAt)}</Table.Cell
								>
								<Table.Cell class="text-right">
									<DropdownMenu.Root>
										<DropdownMenu.Trigger
											class={cn(
												buttonVariants({ variant: 'ghost', size: 'icon' }),
												'size-8'
											)}
											disabled={pendingUserId === user.id}
										>
											<MoreHorizontal aria-hidden="true" />
											<span class="sr-only"
												>{m.admin_users_open_menu({
													name: user.name
												})}</span
											>
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end" class="w-52">
											<DropdownMenu.Group>
												<DropdownMenu.Label
													>{m.admin_users_actions()}</DropdownMenu.Label
												>
												<DropdownMenu.Item
													onSelect={() => {
														selectedUser = {
															id: user.id,
															name: user.name
														};
														isProModalOpen = true;
													}}
												>
													<Gauge aria-hidden="true" />
													{m.admin_users_grant_pro()}
												</DropdownMenu.Item>
												<DropdownMenu.Item
													onSelect={() => toggleStatus(user)}
												>
													{#if user.banned}
														<ShieldCheck aria-hidden="true" />
														{m.admin_users_restore()}
													{:else}
														<UserX aria-hidden="true" />
														{m.admin_users_ban()}
													{/if}
												</DropdownMenu.Item>
											</DropdownMenu.Group>
											<DropdownMenu.Separator />
											<DropdownMenu.Group>
												{#if user.role === 'admin'}
													<DropdownMenu.Item disabled>
														<ShieldCheck aria-hidden="true" />
														{m.account_admin_protected_title()}
													</DropdownMenu.Item>
												{:else}
													<DropdownMenu.Item
														class="text-destructive"
														onSelect={() => deleteUser(user.id)}
													>
														<Trash2 aria-hidden="true" />
														{m.admin_users_delete()}
													</DropdownMenu.Item>
												{/if}
											</DropdownMenu.Group>
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={6} class="h-40 text-center">
									<p class="font-medium">{m.admin_users_empty_title()}</p>
									<p class="mt-1 text-sm text-muted-foreground">
										{m.admin_users_empty_description()}
									</p>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<Dialog.Root bind:open={isProModalOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{m.admin_users_grant_pro_title()}</Dialog.Title>
			<Dialog.Description>
				{selectedUser
					? m.admin_users_grant_pro_description({ name: selectedUser.name })
					: m.admin_users_grant_pro_fallback()}
			</Dialog.Description>
		</Dialog.Header>
		<form class="flex flex-col gap-5" onsubmit={grantPro}>
			<div class="flex flex-col gap-2">
				<Label for="duration">{m.admin_users_duration()}</Label>
				<Input id="duration" name="duration" type="number" min="1" value="1" required />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="unit">{m.admin_users_unit()}</Label>
				<Select.Root type="single" name="unit" bind:value={selectedUnit}>
					<Select.Trigger id="unit">{selectedUnitLabel}</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.Item value="Days" label={m.admin_users_days()}
								>{m.admin_users_days()}</Select.Item
							>
							<Select.Item value="Months" label={m.admin_users_months()}
								>{m.admin_users_months()}</Select.Item
							>
							<Select.Item value="Years" label={m.admin_users_years()}
								>{m.admin_users_years()}</Select.Item
							>
						</Select.Group>
					</Select.Content>
				</Select.Root>
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (isProModalOpen = false)}>
					{m.account_cancel_action()}
				</Button>
				<Button type="submit" disabled={isGrantingPro}>
					<Gauge data-icon="inline-start" aria-hidden="true" />
					{isGrantingPro ? m.admin_users_granting() : m.admin_users_grant_pro_action()}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
