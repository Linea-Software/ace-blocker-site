import { createSignal, createMemo, Show, onSettled } from 'solid-js';
import { revalidate } from '@solidjs/router';
import {
	List,
	Lock,
	Unlock,
	Settings,
	Trash2,
	Calendar,
	RefreshCw,
	ExternalLink,
	HardDrive,
	Hash
} from '@lucide/solid';
import { apiClient } from '$lib/api-client';
import * as m from '$lib/paraglide/messages';
import ReleaseManager from '../_components/ReleaseManager';
import { getSitePacksData } from './data';

const th = 'h-11 px-5 text-xs font-medium text-muted-foreground',
	td = 'px-5 py-4',
	btn =
		'inline-flex min-h-9 items-center rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50 hover:bg-muted',
	input = 'min-h-9 w-full rounded-md border bg-background px-3 py-2 text-sm';
type SyncStatus = {
	running: boolean;
	lastStartedAt: string | null;
	lastCompletedAt: string | null;
	lastError: string | null;
	lastResult: { release: string; updated: number; unchanged: number } | null;
};
const error = (r: { error?: unknown }, f: string) =>
	typeof r?.error === 'object' && r.error && 'message' in r.error ? String(r.error.message) : f;
const date = (value: Date | string) =>
	new Date(value).toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
function bytes(size: number) {
	if (!size) return '0 Bytes';
	const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
	return `${Number((size / 1024 ** i).toFixed(2))} ${units[i]}`;
}
export default function SitePackReleasesPage() {
	const data = createMemo(() => getSitePacksData());
	const [id, setId] = createSignal('');
	const [name, setName] = createSignal('');
	const [pro, setPro] = createSignal(true);
	const [remote, setRemote] = createSignal<SyncStatus>();
	const [pending, setPending] = createSignal(false);
	const [message, setMessage] = createSignal('');
	let notified: string | null = null;
	const refresh = () => revalidate(getSitePacksData.key);
	const status = createMemo(() => remote() ?? (data()?.syncStatus as SyncStatus | undefined));
	const refreshStatus = async () => {
		const response = await apiClient.v1.admin['site-packs']['sync-status'].get();
		if (!response.data) return;
		const next = response.data as SyncStatus,
			completion = next.lastCompletedAt;
		const changed =
			completion !== null && completion !== (notified ?? data()?.syncStatus?.lastCompletedAt);
		setRemote(next);
		if (changed) {
			notified = completion;
			setMessage('');
			await refresh();
		}
	};
	onSettled(() => {
		const t = setInterval(() => void refreshStatus().catch(() => {}), 3000);
		return () => clearInterval(t);
	});
	async function triggerSync() {
		setPending(true);
		setMessage('');
		try {
			const response = await apiClient.v1.admin['site-packs'].sync.post();
			if (response.error) {
				setMessage(error(response, m.admin_sitepacks_sync_request_failed()));
				return;
			}
			const current = status();
			if (current) setRemote({ ...current, running: true, lastError: null });
			setMessage(m.admin_sitepacks_sync_started());
			await refreshStatus();
		} catch {
			setMessage(m.admin_sitepacks_sync_request_failed());
		} finally {
			setPending(false);
		}
	}
	async function upload(form: FormData) {
		const response = await apiClient.v1.admin['site-packs'].upload.post({
			file: form.get('file') as File,
			name: String(form.get('name') ?? ''),
			id: String(form.get('id') ?? ''),
			requiresProSubscription: form.get('requiresProSubscription') === 'true'
		});
		return response.error ? error(response, m.admin_releases_upload_fallback()) : null;
	}
	async function update(form: FormData) {
		const identifier = String(form.get('id') ?? ''),
			display = String(form.get('name') ?? '');
		if (!identifier || !display) return m.admin_releases_missing_required_fields();
		const response = await apiClient.v1.admin['site-packs'].update.post({
			id: identifier,
			name: display,
			requiresProSubscription: form.get('requiresProSubscription') === 'on'
		});
		return response.error ? error(response, m.admin_releases_update_fallback()) : null;
	}
	async function remove(item: { id: string }) {
		const response = await apiClient.v1.admin['site-packs'].delete.post({ id: item.id });
		return response.error ? error(response, m.admin_releases_delete_pack_fallback()) : null;
	}
	return (
		<Show when={data()}>
			{(current) => (
				<>
					<section class="mb-6 flex flex-col gap-4 rounded-lg border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex flex-col gap-2">
							<h2 class="text-base font-semibold">
								{m.admin_sitepacks_sync_title()}
							</h2>
							<p class="max-w-2xl text-sm text-muted-foreground">
								{m.admin_sitepacks_sync_description()}
							</p>
							<Show when={status()}>
								{(s) => (
									<Show
										when={s().running}
										fallback={
											<Show
												when={s().lastError}
												fallback={
													<Show
														when={s().lastResult}
														fallback={
															<p class="text-sm text-muted-foreground">
																{m.admin_sitepacks_sync_never()}
															</p>
														}
													>
														{(result) => (
															<p class="text-sm" role="status">
																{m.admin_sitepacks_sync_complete({
																	release: result().release,
																	updated: String(
																		result().updated
																	),
																	unchanged: String(
																		result().unchanged
																	)
																})}
															</p>
														)}
													</Show>
												}
											>
												<p class="text-sm text-destructive" role="alert">
													{m.admin_sitepacks_sync_failed()}:{' '}
													{s().lastError}
												</p>
											</Show>
										}
									>
										<p role="status" class="text-sm">
											{m.admin_sitepacks_sync_running()}
										</p>
									</Show>
								)}
							</Show>
							<Show when={status()?.lastCompletedAt}>
								<p class="text-xs text-muted-foreground">
									{m.admin_sitepacks_sync_last_completed({
										date: date(status()!.lastCompletedAt!)
									})}
								</p>
							</Show>
							<Show when={message()}>
								<p role="status" class="text-sm">
									{message()}
								</p>
							</Show>
						</div>
						<button
							class={btn}
							disabled={pending() || status()?.running}
							onClick={() => void triggerSync()}
						>
							<RefreshCw
								class={
									'mr-2 inline size-4 ' +
									(status()?.running ? 'animate-spin' : '')
								}
							/>
							{m.admin_sitepacks_sync_button()}
						</button>
					</section>
					<ReleaseManager
						Icon={List}
						title={m.admin_releases_category_sitepacks()}
						description={m.admin_releases_site_packs_description()}
						items={current().sitePacks}
						stats={[
							{
								label: m.admin_releases_total_downloads(),
								value: current().totalDownloads.toLocaleString()
							},
							{
								label: m.admin_releases_active_packs(),
								value: String(current().sitePacks.length)
							},
							{
								label: m.admin_releases_pro_packs(),
								value: String(
									current().sitePacks.filter((p) => p.requiresProSubscription)
										.length
								)
							}
						]}
						uploadTitle={m.admin_releases_upload_pack_title()}
						uploadSubtitle={m.admin_releases_upload_pack_description()}
						deployingLabel={m.admin_releases_deploying_to_cdn()}
						fileFieldLabel={m.admin_releases_pack_file_label()}
						fileInputId="site-pack-file"
						uploadFields={() => (
							<>
								<input
									type="hidden"
									name="requiresProSubscription"
									value={String(pro())}
								/>
								<label class="flex flex-col gap-2 text-sm font-medium">
									{m.admin_releases_pack_id()}
									<input
										class={input}
										name="id"
										value={id()}
										onInput={(e) => setId(e.currentTarget.value)}
										required
										placeholder={m.admin_releases_pack_id_placeholder()}
									/>
								</label>
								<label class="flex flex-col gap-2 text-sm font-medium">
									{m.admin_releases_modal_name()}
									<input
										class={input}
										name="name"
										value={name()}
										onInput={(e) => setName(e.currentTarget.value)}
										required
										placeholder={m.admin_releases_pack_name_placeholder()}
									/>
								</label>
								<label class="flex cursor-pointer items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
									<span>
										<strong class="flex items-center gap-2 text-sm">
											<Lock class="size-4" />
											{m.admin_releases_pro_only()}
										</strong>
										<span class="text-xs text-muted-foreground">
											{m.admin_releases_subscription_required()}
										</span>
									</span>
									<input
										type="checkbox"
										class="size-4 accent-primary"
										checked={pro()}
										onChange={(e) => setPro(e.currentTarget.checked)}
									/>
								</label>
							</>
						)}
						validateUpload={(form) =>
							!(form.get('file') as File)?.size ||
							!form.get('name') ||
							!form.get('id')
								? m.admin_releases_missing_pack_fields()
								: null
						}
						submitUpload={upload}
						submitUpdate={update}
						submitDelete={remove}
						onRefresh={refresh}
						onUploadSuccess={() => {
							setId('');
							setName('');
							setPro(true);
						}}
						columns={() => (
							<>
								<th class={th}>{m.admin_releases_column_name()}</th>
								<th class={th}>{m.admin_releases_column_id()}</th>
								<th class={th}>{m.admin_releases_column_access()}</th>
								<th class={th + ' text-center'}>
									{m.admin_releases_column_downloads()}
								</th>
								<th class={th}>{m.admin_releases_column_updated()}</th>
								<th class={th + ' text-right'}>
									{m.admin_releases_column_actions()}
								</th>
							</>
						)}
						row={(pack, _index, actions) => (
							<>
								<td class={td}>
									<div class="flex min-w-48 flex-col">
										<span class="font-medium">{pack.name}</span>
										<span class="text-xs text-muted-foreground">
											{m.admin_releases_static_payload()}
										</span>
									</div>
								</td>
								<td class={td}>
									<code
										class="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
										title={pack.id}
									>
										{pack.id.substring(0, 8)}…
									</code>
								</td>
								<td class={td}>
									<span class="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs">
										{pack.requiresProSubscription ? (
											<>
												<Lock class="size-3" />
												{m.admin_releases_pro_only()}
											</>
										) : (
											<>
												<Unlock class="size-3" />
												{m.admin_users_free()}
											</>
										)}
									</span>
								</td>
								<td class={td + ' text-center font-mono text-sm'}>
									{pack.downloadCount.toLocaleString()}
								</td>
								<td class={td + ' text-sm text-muted-foreground'}>
									<span class="flex items-center gap-1">
										<Calendar class="size-4" />
										{date(pack.updatedAt)}
									</span>
								</td>
								<td class={td + ' text-right'}>
									<div class="flex justify-end gap-1">
										<button
											class={btn}
											title={m.admin_releases_edit_pack()}
											aria-label={m.admin_releases_edit_pack()}
											onClick={() => actions.openDetails(pack)}
										>
											<Settings class="size-4" />
										</button>
										<button
											class={btn}
											title={m.admin_releases_delete_pack()}
											aria-label={m.admin_releases_delete_pack()}
											onClick={() => actions.confirmDelete(pack)}
										>
											<Trash2 class="size-4" />
										</button>
									</div>
								</td>
							</>
						)}
						empty={(open) => (
							<tr>
								<td colspan={6} class="p-8 text-center">
									<p>{m.admin_releases_empty_packs_title()}</p>
									<p class="text-sm text-muted-foreground">
										{m.admin_releases_empty_packs_description()}
									</p>
									<button class={btn + ' mt-3'} onClick={open}>
										{m.admin_releases_deploy_first()}
									</button>
								</td>
							</tr>
						)}
						details={(pack) => (
							<>
								<label class="flex flex-col gap-2 text-sm font-medium">
									{m.admin_releases_internal_name()}
									<input class={input} name="name" required value={pack.name} />
								</label>
								<label class="flex cursor-pointer items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
									<span class="text-sm">
										<strong class="flex items-center gap-2">
											<Lock class="size-4" />
											{m.admin_releases_pro_only()}
										</strong>
										<span class="text-xs text-muted-foreground">
											{m.admin_releases_access_control()}
										</span>
									</span>
									<input
										class="size-4 accent-primary"
										type="checkbox"
										name="requiresProSubscription"
										checked={pack.requiresProSubscription}
									/>
								</label>
								<div class="border-t pt-5">
									<p class="mb-3 text-sm font-medium">
										{m.admin_releases_technical_assets()}
									</p>
									<div class="grid gap-3 sm:grid-cols-2">
										<div class="rounded-lg border bg-muted/30 p-3">
											<p class="flex gap-2 text-xs text-muted-foreground">
												<HardDrive class="size-3" />
												{m.admin_releases_file_size()}
											</p>
											<p class="mt-1 font-mono text-sm">{bytes(pack.size)}</p>
										</div>
										<div class="rounded-lg border bg-muted/30 p-3">
											<p class="flex gap-2 text-xs text-muted-foreground">
												<Hash class="size-3" />
												{m.admin_releases_sha256()}
											</p>
											<p
												title={pack.sha256}
												class="mt-1 truncate font-mono text-sm"
											>
												{pack.sha256.substring(0, 12)}…
											</p>
										</div>
									</div>
								</div>
								<label class="flex flex-col gap-2 text-sm font-medium">
									{m.admin_releases_full_uuid()}
									<input class={input + ' font-mono'} readonly value={pack.id} />
								</label>
								<label class="flex flex-col gap-2 text-sm font-medium">
									{m.admin_releases_cdn_link()}
									<span class="flex gap-2">
										<input
											class={input + ' font-mono'}
											readonly
											value={pack.downloadUrl}
										/>
										<a
											class={btn}
											href={pack.downloadUrl}
											target="_blank"
											rel="noreferrer"
											title={m.admin_releases_open_cdn()}
										>
											<ExternalLink class="size-4" />
										</a>
									</span>
								</label>
							</>
						)}
						confirmDeleteLabel={m.admin_releases_delete_permanently()}
						deleteBody={(pack) => (
							<p class="text-sm text-muted-foreground">
								{m.admin_releases_delete_site_pack({ name: pack.name })}
							</p>
						)}
					/>
				</>
			)}
		</Show>
	);
}
