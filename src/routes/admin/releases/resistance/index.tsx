import { createSignal, createMemo, onSettled, Show } from 'solid-js';
import { revalidate } from '@solidjs/router';
import { ScrollText, RefreshCw, Calendar, Trash2 } from '@lucide/solid';
import { apiClient } from '$lib/api-client';
import * as m from '$lib/paraglide/messages';
import ReleaseManager from '../_components/ReleaseManager';
import { getResistanceData } from './data';

const th = 'h-11 px-5 text-xs font-medium text-muted-foreground',
	td = 'px-5 py-4',
	btn =
		'inline-flex min-h-9 items-center rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50 hover:bg-muted',
	input = 'w-full rounded-md border bg-background px-3 py-2';
type Status = {
	running: boolean;
	lastStartedAt: string | null;
	lastCompletedAt: string | null;
	lastError: string | null;
	lastResult: { release: string; version: string; sha256: string; imported: boolean } | null;
};
const error = (r: { error?: unknown }, f: string) =>
	typeof r?.error === 'object' && r.error && 'message' in r.error ? String(r.error.message) : f;
export default function ResistanceReleasesPage() {
	const data = createMemo(() => getResistanceData());
	const [version, setVersion] = createSignal('');
	const [remote, setRemote] = createSignal<Status>();
	const [pending, setPending] = createSignal(false);
	const [message, setMessage] = createSignal('');
	let notified: string | null = null;
	const refresh = () => revalidate(getResistanceData.key);
	const status = createMemo(() => remote() ?? (data()?.githubImportStatus as Status | undefined));
	const refreshStatus = async () => {
		const response = await apiClient.v1.admin.resistance['github-import-status'].get();
		if (!response.data) return;
		const result = response.data as Status;
		const completion = result.lastCompletedAt;
		const changed =
			completion !== null &&
			completion !== (notified ?? data()?.githubImportStatus?.lastCompletedAt);
		setRemote(result);
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
	async function startImport() {
		setPending(true);
		setMessage('');
		try {
			const response = await apiClient.v1.admin.resistance['github-import'].post();
			if (response.error) {
				setMessage(error(response, m.admin_resistance_github_request_failed()));
				return;
			}
			setMessage(m.admin_resistance_github_started());
			await refreshStatus();
		} catch {
			setMessage(m.admin_resistance_github_request_failed());
		} finally {
			setPending(false);
		}
	}
	async function upload(form: FormData) {
		const response = await apiClient.v1.admin.resistance.upload.post({
			file: form.get('file') as File,
			version: String(form.get('version') ?? '')
		});
		return response.error ? error(response, m.admin_releases_upload_fallback()) : null;
	}
	async function remove(item: { id: string; canBeDownloaded: boolean }) {
		const response = await apiClient.v1.admin.resistance.delete.post({ id: item.id });
		return response.error ? error(response, m.admin_releases_delete_fallback()) : null;
	}
	async function toggle(item: { id: string; canBeDownloaded: boolean }) {
		const response = await apiClient.v1.admin.resistance['set-downloadable'].post({
			id: item.id,
			canBeDownloaded: !item.canBeDownloaded
		});
		if (response.error) {
			window.alert(error(response, m.admin_releases_availability_fallback()));
			return;
		}
		await refresh();
	}
	return (
		<Show when={data()}>
			{(current) => (
				<>
					<section class="mb-6 flex flex-col gap-4 rounded-lg border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex flex-col gap-2">
							<h2 class="text-base font-semibold">
								{m.admin_resistance_github_title()}
							</h2>
							<p class="max-w-2xl text-sm text-muted-foreground">
								{m.admin_resistance_github_description()}
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
																{m.admin_resistance_github_never()}
															</p>
														}
													>
														{(result) => (
															<p role="status" class="text-sm">
																{result().imported
																	? m.admin_resistance_github_imported(
																			{
																				version:
																					result().version
																			}
																		)
																	: m.admin_resistance_github_unchanged(
																			{
																				version:
																					result().version
																			}
																		)}
															</p>
														)}
													</Show>
												}
											>
												<p role="alert" class="text-sm text-destructive">
													{m.admin_resistance_github_failed()}:{' '}
													{s().lastError}
												</p>
											</Show>
										}
									>
										<p role="status" class="text-sm">
											{m.admin_resistance_github_running()}
										</p>
									</Show>
								)}
							</Show>
							<Show when={message()}>
								<p class="text-sm" role="status">
									{message()}
								</p>
							</Show>
						</div>
						<button
							class={btn}
							disabled={pending() || status()?.running}
							onClick={() => void startImport()}
						>
							<RefreshCw
								class={
									'mr-2 inline size-4 ' +
									(status()?.running ? 'animate-spin' : '')
								}
							/>
							{m.admin_resistance_github_button()}
						</button>
					</section>
					<ReleaseManager
						Icon={ScrollText}
						title={m.admin_releases_category_resistance()}
						description={m.admin_releases_resistance_description()}
						items={current().releases}
						stats={[
							{
								label: m.admin_releases_total_downloads(),
								value: current().totalDownloads.toLocaleString()
							},
							{
								label: m.admin_releases_active_scripts(),
								value: String(current().releases.length)
							},
							{
								label: m.admin_releases_published_scripts(),
								value: String(
									current().releases.filter((r) => r.canBeDownloaded).length
								)
							}
						]}
						uploadTitle={m.admin_releases_upload_resistance_title()}
						uploadSubtitle={m.admin_releases_upload_resistance_description()}
						fileFieldLabel={m.admin_releases_resistance_file_label()}
						fileInputId="resistance-file"
						onRefresh={refresh}
						uploadFields={() => (
							<label class="flex flex-col gap-2 text-sm font-medium">
								{m.admin_releases_modal_version()}
								<input
									class={input}
									name="version"
									required
									value={version()}
									onInput={(e) => setVersion(e.currentTarget.value)}
									placeholder={m.admin_releases_version_placeholder()}
								/>
							</label>
						)}
						validateUpload={(form) =>
							!(form.get('file') as File)?.size || !form.get('version')
								? m.admin_releases_missing_file_version()
								: null
						}
						submitUpload={upload}
						submitDelete={remove}
						onUploadSuccess={() => setVersion('')}
						columns={() => (
							<>
								<th class={th}>{m.admin_releases_column_version()}</th>
								<th class={th}>{m.admin_releases_column_file_name()}</th>
								<th class={th + ' text-center'}>
									{m.admin_releases_column_status()}
								</th>
								<th class={th + ' text-center'}>
									{m.admin_releases_column_downloads()}
								</th>
								<th class={th}>{m.admin_releases_column_release_date()}</th>
								<th class={th + ' text-right'}>
									{m.admin_releases_column_actions()}
								</th>
							</>
						)}
						row={(item, index, actions) => (
							<>
								<td class={td}>
									<span class="font-medium">{item.version}</span>
									<Show when={index === 0 && item.canBeDownloaded}>
										<span class="ml-2 rounded border px-2 text-xs">
											{m.admin_releases_latest()}
										</span>
									</Show>
								</td>
								<td class={td}>
									<code class="block max-w-64 truncate text-xs text-muted-foreground">
										{item.fileName}
									</code>
								</td>
								<td class={td + ' text-center'}>
									<span class="rounded border px-2 py-1 text-xs">
										{item.canBeDownloaded
											? m.admin_releases_status_live()
											: m.admin_releases_status_staged()}
									</span>
								</td>
								<td class={td + ' text-center font-mono text-sm'}>
									{item.downloadCount.toLocaleString()}
								</td>
								<td class={td + ' text-sm text-muted-foreground'}>
									<span class="flex items-center gap-1">
										<Calendar class="size-4" />
										{new Date(item.createdAt).toLocaleDateString()}
									</span>
								</td>
								<td class={td + ' text-right'}>
									<div class="flex justify-end gap-2">
										<button class={btn} onClick={() => void toggle(item)}>
											{item.canBeDownloaded
												? m.admin_releases_withdraw()
												: m.admin_releases_make_available()}
										</button>
										<button
											class={btn}
											title={m.admin_releases_delete_record()}
											aria-label={m.admin_releases_delete_record()}
											onClick={() => actions.confirmDelete(item)}
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
									<p>{m.admin_releases_empty_resistance_title()}</p>
									<p class="mt-2 text-sm text-muted-foreground">
										{m.admin_releases_empty_resistance_description()}
									</p>
									<button class={btn + ' mt-3'} onClick={open}>
										{m.admin_releases_deploy_first()}
									</button>
								</td>
							</tr>
						)}
						deleteBody={(item) => (
							<p class="text-sm text-muted-foreground">
								{m.admin_releases_delete_resistance({
									version: item.version,
									fileName: item.fileName
								})}
							</p>
						)}
					/>
				</>
			)}
		</Show>
	);
}
