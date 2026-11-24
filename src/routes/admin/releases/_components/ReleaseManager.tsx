import DialogShell from '../../../account/_components/DialogShell';
import { createSignal, For, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { AlertTriangle, FileUp, Upload, UploadCloud, Settings } from '@lucide/solid';
import * as m from '$lib/paraglide/messages';

export interface ReleaseStat {
	label: string;
	value: string;
	accent?: boolean;
}
export interface RowActions<T> {
	openDetails(item: T): void;
	confirmDelete(item: T): void;
}
export interface ReleaseManagerProps<T extends { id: string }> {
	Icon: (props: { class?: string }) => JSX.Element;
	title: string;
	description: string;
	items: T[];
	stats: ReleaseStat[];
	uploadTitle: string;
	uploadSubtitle: string;
	uploadSubtitleHighlight?: string;
	fileFieldLabel?: string;
	fileInputId?: string;
	fileAccept?: string;
	uploadFields: () => JSX.Element;
	validateUpload(form: FormData): string | null;
	submitUpload(form: FormData): Promise<string | null>;
	onUploadSuccess?(): void;
	onRefresh(): Promise<void> | void;
	columns: () => JSX.Element;
	row: (item: T, index: number, actions: RowActions<T>) => JSX.Element;
	empty: (open: () => void) => JSX.Element;
	details?: (item: T) => JSX.Element;
	submitUpdate?: (form: FormData) => Promise<string | null>;
	submitDelete: (item: T) => Promise<string | null>;
	deleteBody: (item: T) => JSX.Element;
	confirmDeleteLabel?: string;
	deployingLabel?: string;
}

const button =
	'inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50';
const outline =
	'inline-flex min-h-9 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted';
function Modal(props: {
	title: string;
	description?: string;
	children: JSX.Element;
	onClose: () => void;
}) {
	return (
		<DialogShell
			open={true}
			onOpenChange={(open) => {
				if (!open) props.onClose();
			}}
			title={props.title}
			description={props.description ?? ''}
			class="max-w-lg"
		>
			<div class="mt-5">{props.children}</div>
		</DialogShell>
	);
}
/** Shared inventory + upload + edit + delete flows; API errors stay visible in the dialog. */
export default function ReleaseManager<T extends { id: string }>(props: ReleaseManagerProps<T>) {
	const [uploadOpen, setUploadOpen] = createSignal(false);
	const [detailsOpen, setDetailsOpen] = createSignal(false);
	const [deleteOpen, setDeleteOpen] = createSignal(false);
	const [selected, setSelected] = createSignal<T>();
	const [toDelete, setToDelete] = createSignal<T>();
	const [uploadFile, setUploadFile] = createSignal<File>();
	const [dragging, setDragging] = createSignal(false);
	const [working, setWorking] = createSignal<'upload' | 'update' | 'delete' | null>(null);
	const [uploadError, setUploadError] = createSignal<string>();
	const [updateError, setUpdateError] = createSignal<string>();
	const [deleteError, setDeleteError] = createSignal<string>();
	const actions: RowActions<T> = {
		openDetails(item) {
			setSelected(() => ({ ...item }));
			setUpdateError(undefined);
			setDetailsOpen(true);
		},
		confirmDelete(item) {
			setToDelete(() => item);
			setDeleteError(undefined);
			setDeleteOpen(true);
		}
	};
	async function deploy(event: SubmitEvent) {
		event.preventDefault();
		const form = new FormData(event.currentTarget as HTMLFormElement);
		const failure = props.validateUpload(form);
		if (failure) {
			setUploadError(failure);
			return;
		}
		setWorking('upload');
		setUploadError(undefined);
		try {
			const error = await props.submitUpload(form);
			if (error) {
				setUploadError(error);
				return;
			}
			setUploadOpen(false);
			setUploadFile(undefined);
			props.onUploadSuccess?.();
			await props.onRefresh();
		} catch {
			setUploadError(m.admin_releases_upload_fallback());
		} finally {
			setWorking(null);
		}
	}
	async function update(event: SubmitEvent) {
		event.preventDefault();
		if (!props.submitUpdate) return;
		setWorking('update');
		setUpdateError(undefined);
		try {
			const error = await props.submitUpdate(
				new FormData(event.currentTarget as HTMLFormElement)
			);
			if (error) {
				setUpdateError(error);
				return;
			}
			setDetailsOpen(false);
			await props.onRefresh();
		} catch {
			setUpdateError(m.admin_releases_update_fallback());
		} finally {
			setWorking(null);
		}
	}
	async function remove() {
		const item = toDelete();
		if (!item) return;
		setWorking('delete');
		setDeleteError(undefined);
		try {
			const error = await props.submitDelete(item);
			if (error) {
				setDeleteError(error);
				return;
			}
			setDeleteOpen(false);
			setToDelete(undefined);
			await props.onRefresh();
		} catch {
			setDeleteError(m.admin_releases_delete_fallback());
		} finally {
			setWorking(null);
		}
	}
	return (
		<>
			<div class="flex flex-col gap-8">
				<header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<div class="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
							<props.Icon class="size-5" />
							{m.admin_releases_eyebrow()}
						</div>
						<h1 class="font-display text-3xl font-semibold">{props.title}</h1>
						<p class="mt-1 max-w-2xl text-muted-foreground">{props.description}</p>
					</div>
					<div class="flex items-center gap-3">
						<span class="rounded-md border px-2 py-1 text-sm">
							{m.admin_releases_records({ count: props.items.length })}
						</span>
						<button
							class={button}
							onClick={() => {
								setUploadError(undefined);
								setUploadOpen(true);
							}}
						>
							<Upload class="size-4" />
							{m.admin_releases_deploy_new()}
						</button>
					</div>
				</header>
				<section
					class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
					aria-label={m.admin_releases_summary()}
				>
					<For each={props.stats}>
						{(stat) => (
							<div class="rounded-lg border bg-card p-5">
								<p class="text-sm font-medium text-muted-foreground">
									{stat.label}
								</p>
								<p class="mt-3 font-display text-3xl font-semibold">{stat.value}</p>
							</div>
						)}
					</For>
				</section>
				<div class="overflow-hidden rounded-lg border bg-card">
					<div class="border-b p-6">
						<h2 class="text-xl font-semibold">{m.admin_releases_inventory_title()}</h2>
						<p class="mt-1 text-sm text-muted-foreground">
							{m.admin_releases_inventory_description({ category: props.title })}
						</p>
					</div>
					<div class="overflow-x-auto">
						<table class="w-full border-collapse text-left">
							<thead class="bg-muted/50">
								<tr class="border-b">{props.columns()}</tr>
							</thead>
							<tbody class="divide-y">
								<For
									each={props.items}
									fallback={props.empty(() => {
										setUploadError(undefined);
										setUploadOpen(true);
									})}
								>
									{(item, index) => (
										<tr class="group transition-colors hover:bg-muted/40">
											{props.row(item, index(), actions)}
										</tr>
									)}
								</For>
							</tbody>
						</table>
					</div>
				</div>
			</div>
			<Show when={uploadOpen()}>
				<Modal
					title={props.uploadTitle}
					description={props.uploadSubtitle + (props.uploadSubtitleHighlight ?? '')}
					onClose={() => setUploadOpen(false)}
				>
					<form class="flex flex-col gap-5" onSubmit={deploy}>
						<Show when={uploadError()}>
							<p
								role="alert"
								class="rounded border border-destructive p-3 text-sm text-destructive"
							>
								<AlertTriangle class="mr-2 inline size-4" />
								{m.admin_releases_upload_failed()}: {uploadError()}
							</p>
						</Show>
						{props.uploadFields()}
						<div class="flex flex-col gap-2">
							<label
								for={props.fileInputId ?? 'release-file'}
								class="text-sm font-medium"
							>
								{props.fileFieldLabel ?? m.admin_releases_modal_file()}
							</label>
							<div class="group relative">
								<input
									id={props.fileInputId ?? 'release-file'}
									type="file"
									name="file"
									accept={props.fileAccept}
									required
									class="absolute inset-0 z-10 size-full cursor-pointer opacity-0"
									onChange={(e) => setUploadFile(e.currentTarget.files?.[0])}
									onDragOver={(e) => {
										e.preventDefault();
										setDragging(true);
									}}
									onDragLeave={(e) => {
										e.preventDefault();
										setDragging(false);
									}}
									onDrop={(e) => {
										e.preventDefault();
										setDragging(false);
										if (e.dataTransfer?.files.length) {
											e.currentTarget.files = e.dataTransfer.files;
											setUploadFile(e.dataTransfer.files[0]);
										}
									}}
								/>
								<div
									class={
										'flex h-36 flex-col items-center justify-center rounded-md border-2 border-dashed p-5 text-center ' +
										(dragging()
											? 'border-primary bg-primary/5'
											: 'bg-muted/30 group-hover:bg-muted/60')
									}
								>
									<UploadCloud class="mb-2 size-7 text-muted-foreground" />
									<p class="max-w-full truncate text-sm font-medium">
										{uploadFile()?.name ??
											(dragging()
												? m.admin_releases_drop_file()
												: m.admin_releases_choose_file())}
									</p>
									<p class="mt-1 text-xs text-muted-foreground">
										{uploadFile()
											? m.admin_releases_file_ready()
											: m.admin_releases_drag_hint()}
									</p>
								</div>
							</div>
						</div>
						<div class="flex justify-end gap-3">
							<button
								type="button"
								class={outline}
								onClick={() => setUploadOpen(false)}
							>
								{m.account_cancel_action()}
							</button>
							<button type="submit" disabled={working() === 'upload'} class={button}>
								<FileUp class="size-4" />
								{working() === 'upload'
									? (props.deployingLabel ?? m.admin_releases_deploying())
									: m.admin_releases_start_deployment()}
							</button>
						</div>
					</form>
				</Modal>
			</Show>
			<Show when={detailsOpen() && selected() && props.details}>
				<Modal
					title={m.admin_releases_details_title()}
					description={m.admin_releases_details_description()}
					onClose={() => setDetailsOpen(false)}
				>
					<form class="flex flex-col gap-5" onSubmit={update}>
						<input type="hidden" name="id" value={selected()?.id} />
						<Show when={updateError()}>
							<p role="alert" class="text-destructive">
								{updateError()}
							</p>
						</Show>
						{selected() && props.details?.(selected()!)}
						<div class="flex justify-end gap-3">
							<button
								type="button"
								class={outline}
								onClick={() => setDetailsOpen(false)}
							>
								{m.account_cancel_action()}
							</button>
							<button type="submit" class={button} disabled={working() === 'update'}>
								<Settings class="size-4" />
								{working() === 'update'
									? m.admin_releases_saving()
									: m.admin_releases_save_configuration()}
							</button>
						</div>
					</form>
				</Modal>
			</Show>
			<Show when={deleteOpen()}>
				<Modal
					title={m.admin_releases_confirm_delete_title()}
					description={m.admin_releases_confirm_delete_description()}
					onClose={() => setDeleteOpen(false)}
				>
					<Show when={toDelete()}>{(item) => props.deleteBody(item())}</Show>
					<Show when={deleteError()}>
						<p role="alert" class="mt-3 text-sm text-destructive">
							{deleteError()}
						</p>
					</Show>
					<div class="mt-5 flex justify-end gap-3">
						<button type="button" class={outline} onClick={() => setDeleteOpen(false)}>
							{m.account_cancel_action()}
						</button>
						<button
							type="button"
							disabled={working() === 'delete'}
							class={button + ' text-destructive-foreground bg-destructive'}
							onClick={remove}
						>
							{working() === 'delete'
								? m.admin_releases_deleting()
								: (props.confirmDeleteLabel ??
									m.admin_releases_confirm_delete_action())}
						</button>
					</div>
				</Modal>
			</Show>
		</>
	);
}
