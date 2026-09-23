<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as m from '$lib/paraglide/messages';
	import {
		AlertTriangle,
		FileUp,
		LoaderCircle,
		Settings,
		Upload,
		UploadCloud
	} from '@lucide/svelte';
	import type { Component, Snippet } from 'svelte';

	interface ReleaseStat {
		label: string;
		value: string;
		accent?: boolean;
	}

	interface RowActions {
		openDetails: (item: any) => void;
		confirmDelete: (item: any) => void;
	}

	let {
		Icon,
		title,
		description,
		items,
		stats,
		uploadTitle,
		uploadSubtitle,
		uploadSubtitleHighlight,
		UploadIcon = Upload,
		deployingLabel = m.admin_releases_deploying(),
		fileFieldLabel = m.admin_releases_modal_file(),
		fileInputId = 'release-file',
		DropzoneIcon = UploadCloud,
		uploadFields,
		validateUpload,
		submitUpload,
		onUploadSuccess,
		columns,
		row,
		empty,
		details,
		submitUpdate,
		submitDelete,
		confirmDeleteLabel = m.admin_releases_confirm_delete_action(),
		deleteBody
	}: {
		Icon: Component;
		title: string;
		description: string;
		items: any[];
		stats: ReleaseStat[];
		uploadTitle: string;
		uploadSubtitle: string;
		uploadSubtitleHighlight?: string;
		UploadIcon?: Component;
		deployingLabel?: string;
		fileFieldLabel?: string;
		fileInputId?: string;
		DropzoneIcon?: Component;
		uploadFields: Snippet;
		validateUpload: (formData: FormData) => string | null;
		submitUpload: (formData: FormData) => Promise<string | null>;
		onUploadSuccess?: () => void;
		columns: Snippet;
		row: Snippet<[any, number, RowActions]>;
		empty: Snippet<[() => void]>;
		details?: Snippet<[any]>;
		submitUpdate?: (formData: FormData) => Promise<string | null>;
		submitDelete: (item: any) => Promise<string | null>;
		confirmDeleteLabel?: string;
		deleteBody: Snippet<[any]>;
	} = $props();

	let isUploadModalOpen = $state(false);
	let isDetailsModalOpen = $state(false);
	let isDeleteModalOpen = $state(false);
	let isDeploying = $state(false);
	let isUpdating = $state(false);
	let isDeleting = $state(false);
	let selectedRelease = $state<any>(null);
	let itemToDelete = $state<any>(null);
	let isDragging = $state(false);
	let uploadError = $state<string | null>(null);
	let updateError = $state<string | null>(null);
	let deleteError = $state<string | null>(null);
	let uploadFile = $state<File | null>(null);

	function openUploadModal() {
		uploadError = null;
		isUploadModalOpen = true;
	}

	function openDetails(release: any) {
		selectedRelease = { ...release };
		updateError = null;
		isDetailsModalOpen = true;
	}

	function confirmDelete(item: any) {
		itemToDelete = item;
		deleteError = null;
		isDeleteModalOpen = true;
	}

	const rowActions: RowActions = { openDetails, confirmDelete };

	async function handleDeploy(event: SubmitEvent) {
		event.preventDefault();
		isDeploying = true;
		uploadError = null;

		const formData = new FormData(event.currentTarget as HTMLFormElement);
		const validationError = validateUpload(formData);
		if (validationError) {
			uploadError = validationError;
			isDeploying = false;
			return;
		}

		const error = await submitUpload(formData);
		isDeploying = false;
		if (error) {
			uploadError = error;
			return;
		}

		isUploadModalOpen = false;
		uploadFile = null;
		onUploadSuccess?.();
		await invalidateAll();
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
	}

	function handleDrop(event: DragEvent & { currentTarget: EventTarget & HTMLInputElement }) {
		event.preventDefault();
		isDragging = false;
		if (event.dataTransfer?.files.length) {
			uploadFile = event.dataTransfer.files[0];
			event.currentTarget.files = event.dataTransfer.files;
		}
	}

	async function handleUpdate(event: SubmitEvent) {
		if (!submitUpdate) return;
		event.preventDefault();
		isUpdating = true;
		updateError = null;

		const error = await submitUpdate(new FormData(event.currentTarget as HTMLFormElement));
		isUpdating = false;
		if (error) {
			updateError = error;
			return;
		}

		isDetailsModalOpen = false;
		await invalidateAll();
	}

	async function handleDelete() {
		if (!itemToDelete) return;
		isDeleting = true;
		deleteError = null;

		const error = await submitDelete(itemToDelete);
		isDeleting = false;
		if (error) {
			deleteError = error;
			return;
		}

		isDeleteModalOpen = false;
		itemToDelete = null;
		await invalidateAll();
	}
</script>

<div class="flex flex-col gap-8">
	<header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
				<Icon aria-hidden="true" />
				{m.admin_releases_eyebrow()}
			</div>
			<div>
				<h1 class="font-display text-3xl font-semibold">{title}</h1>
				<p class="mt-1 max-w-2xl text-muted-foreground">{description}</p>
			</div>
		</div>

		<div class="flex items-center gap-3">
			<Badge variant="outline">{m.admin_releases_records({ count: items.length })}</Badge>
			<Button onclick={openUploadModal}>
				<Upload data-icon="inline-start" aria-hidden="true" />
				{m.admin_releases_deploy_new()}
			</Button>
		</div>
	</header>

	<section
		class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
		aria-label={m.admin_releases_summary()}
	>
		{#each stats as stat (stat.label)}
			<Card.Root class="gap-3 py-5">
				<Card.Header class="px-5">
					<Card.Title class="text-sm font-medium text-muted-foreground"
						>{stat.label}</Card.Title
					>
				</Card.Header>
				<Card.Content class="px-5">
					<p
						class={stat.accent
							? 'font-display text-3xl font-semibold'
							: 'font-display text-3xl font-semibold'}
					>
						{stat.value}
					</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</section>

	<Card.Root class="overflow-hidden">
		<Card.Header class="border-b">
			<Card.Title>{m.admin_releases_inventory_title()}</Card.Title>
			<Card.Description
				>{m.admin_releases_inventory_description({ category: title })}</Card.Description
			>
		</Card.Header>
		<Card.Content class="p-0">
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-left">
					<thead class="bg-muted/50">
						<tr class="border-b">{@render columns()}</tr>
					</thead>
					<tbody class="divide-y">
						{#each items as item, index (item.id)}
							<tr class="group transition-colors hover:bg-muted/40">
								{@render row(item, index, rowActions)}
							</tr>
						{:else}
							{@render empty(openUploadModal)}
						{/each}
					</tbody>
				</table>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<Dialog.Root bind:open={isUploadModalOpen}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<UploadIcon aria-hidden="true" />
				{uploadTitle}
			</Dialog.Title>
			<Dialog.Description>
				{uploadSubtitle}{#if uploadSubtitleHighlight}<strong
						class="font-medium text-foreground">{uploadSubtitleHighlight}</strong
					>{/if}
			</Dialog.Description>
		</Dialog.Header>

		<form class="flex flex-col gap-5" onsubmit={handleDeploy}>
			{#if uploadError}
				<Alert.Root variant="destructive">
					<AlertTriangle aria-hidden="true" />
					<Alert.Title>{m.admin_releases_upload_failed()}</Alert.Title>
					<Alert.Description>{uploadError}</Alert.Description>
				</Alert.Root>
			{/if}

			{@render uploadFields()}

			<div class="flex flex-col gap-2">
				<label for={fileInputId} class="text-sm font-medium">{fileFieldLabel}</label>
				<div class="group relative">
					<input
						id={fileInputId}
						type="file"
						name="file"
						class="absolute inset-0 size-full cursor-pointer opacity-0"
						onchange={(event) => (uploadFile = event.currentTarget.files?.[0] ?? null)}
						ondragover={handleDragOver}
						ondragleave={handleDragLeave}
						ondrop={handleDrop}
						required
					/>
					<div
						class={isDragging
							? 'flex h-36 flex-col items-center justify-center rounded-md border-2 border-dashed border-primary bg-primary/5 p-5 text-center'
							: 'flex h-36 flex-col items-center justify-center rounded-md border-2 border-dashed bg-muted/30 p-5 text-center transition-colors group-hover:bg-muted/60'}
					>
						<DropzoneIcon
							class="mb-2 size-7 text-muted-foreground"
							aria-hidden="true"
						/>
						{#if uploadFile}
							<p class="max-w-full truncate text-sm font-medium">{uploadFile.name}</p>
							<p class="mt-1 text-xs text-muted-foreground">
								{m.admin_releases_file_ready()}
							</p>
						{:else}
							<p class="text-sm font-medium">
								{isDragging
									? m.admin_releases_drop_file()
									: m.admin_releases_choose_file()}
							</p>
							<p class="mt-1 text-xs text-muted-foreground">
								{m.admin_releases_drag_hint()}
							</p>
						{/if}
					</div>
				</div>
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (isUploadModalOpen = false)}>
					{m.account_cancel_action()}
				</Button>
				<Button type="submit" disabled={isDeploying}>
					{#if isDeploying}
						<LoaderCircle
							class="animate-spin"
							data-icon="inline-start"
							aria-hidden="true"
						/>
						{deployingLabel}
					{:else}
						<FileUp data-icon="inline-start" aria-hidden="true" />
						{m.admin_releases_start_deployment()}
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

{#if details && selectedRelease}
	<Dialog.Root bind:open={isDetailsModalOpen}>
		<Dialog.Content class="sm:max-w-lg">
			<Dialog.Header>
				<Dialog.Title class="flex items-center gap-2">
					<Settings aria-hidden="true" />
					{m.admin_releases_details_title()}
				</Dialog.Title>
				<Dialog.Description>{m.admin_releases_details_description()}</Dialog.Description>
			</Dialog.Header>
			<form class="flex flex-col gap-5" onsubmit={handleUpdate}>
				<input type="hidden" name="id" value={selectedRelease.id} />
				{#if updateError}
					<Alert.Root variant="destructive">
						<AlertTriangle aria-hidden="true" />
						<Alert.Title>{m.admin_releases_update_failed()}</Alert.Title>
						<Alert.Description>{updateError}</Alert.Description>
					</Alert.Root>
				{/if}
				{@render details(selectedRelease)}
				<Dialog.Footer>
					<Button
						type="button"
						variant="outline"
						onclick={() => (isDetailsModalOpen = false)}
					>
						{m.account_cancel_action()}
					</Button>
					<Button type="submit" disabled={isUpdating}>
						{#if isUpdating}
							<LoaderCircle
								class="animate-spin"
								data-icon="inline-start"
								aria-hidden="true"
							/>
							{m.admin_releases_saving()}
						{:else}
							{m.admin_releases_save_configuration()}
						{/if}
					</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<Dialog.Root bind:open={isDeleteModalOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<AlertTriangle class="text-destructive" aria-hidden="true" />
				{m.admin_releases_confirm_delete_title()}
			</Dialog.Title>
			<Dialog.Description>{m.admin_releases_confirm_delete_description()}</Dialog.Description>
		</Dialog.Header>
		{#if itemToDelete}
			{@render deleteBody(itemToDelete)}
		{/if}
		{#if deleteError}
			<Alert.Root variant="destructive">
				<AlertTriangle aria-hidden="true" />
				<Alert.Title>{m.admin_releases_delete_failed()}</Alert.Title>
				<Alert.Description>{deleteError}</Alert.Description>
			</Alert.Root>
		{/if}
		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={() => (isDeleteModalOpen = false)}>
				{m.account_cancel_action()}
			</Button>
			<Button
				type="button"
				variant="destructive"
				onclick={handleDelete}
				disabled={isDeleting}
			>
				{#if isDeleting}
					<LoaderCircle
						class="animate-spin"
						data-icon="inline-start"
						aria-hidden="true"
					/>
					{m.admin_releases_deleting()}
				{:else}
					{confirmDeleteLabel}
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
