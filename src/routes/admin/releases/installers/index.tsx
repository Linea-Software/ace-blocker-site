import { createSignal, createMemo, Show } from 'solid-js';
import { revalidate } from '@solidjs/router';
import { HardDrive, Layers, Cpu, ShieldCheck, Calendar, Trash2 } from '@lucide/solid';
import * as m from '$lib/paraglide/messages';
import { apiClient } from '$lib/api-client';
import { expectedInstallerFiles } from '$lib/installer-release-policy';
import {
	installerActionBlock,
	type InstallerActionBlock,
	type InstallerRecord
} from '$lib/installer-publication-ui';
import ReleaseManager from '../_components/ReleaseManager';
import { getInstallersData } from './data';

const th = 'h-11 px-5 text-xs font-medium text-muted-foreground';
const td = 'px-5 py-4';
const button =
	'inline-flex min-h-9 items-center rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-40 hover:bg-muted';
const input = 'min-h-9 w-full rounded-md border bg-background px-3 text-sm';
function err(response: { error?: unknown }, fallback: string) {
	return response?.error && typeof response.error === 'object' && 'message' in response.error
		? String(response.error.message)
		: fallback;
}
const date = (value: Date | string) =>
	new Date(value).toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
export default function InstallerReleasesPage() {
	const data = createMemo(() => getInstallersData());
	const [version, setVersion] = createSignal('');
	const [os, setOs] = createSignal('linux');
	const refresh = () => revalidate(getInstallersData.key);
	const validate = (form: FormData) => {
		const file = form.get('file') as File;
		const ver = String(form.get('version') ?? '');
		if (!file?.size || !ver) return m.admin_releases_missing_file_version();
		if (!data()?.allowUnsignedPublishing && os() === 'windows')
			return m.admin_releases_manual_windows_production();
		if (!/^\d+\.\d+\.\d+$/.test(ver)) return m.admin_releases_expected_version();
		const expected = expectedInstallerFiles(os(), ver);
		return expected.includes(file.name)
			? null
			: m.admin_releases_expected_filename({ filename: expected.join(' / ') });
	};
	const upload = async (form: FormData) => {
		const response = await apiClient.v1.admin.installers.upload.post({
			file: form.get('file') as File,
			version: String(form.get('version') ?? ''),
			os: os() as 'linux' | 'windows',
			architecture: 'x64'
		});
		return response.error ? err(response, m.admin_releases_upload_fallback()) : null;
	};
	const remove = async (item: InstallerRecord & { id: string }) => {
		const response = await apiClient.v1.admin.installers.delete.post({ id: item.id });
		return response.error ? err(response, m.admin_releases_delete_fallback()) : null;
	};
	function blockLabel(block: InstallerActionBlock): string {
		switch (block) {
			case 'unverified':
				return m.admin_releases_unverified_reason();
			case 'withdrawn':
				return m.admin_releases_withdrawn_reason();
			case 'linked_linux':
				return m.admin_releases_linux_linked_reason();
			case 'manual_windows':
				return m.admin_releases_manual_windows_production();
			case 'manual_linux':
				return m.admin_releases_manual_linux_production();
			case 'missing_linux':
				return m.admin_releases_missing_linux_companion();
			case 'unavailable':
				return m.admin_releases_unavailable_reason();
		}
	}
	async function toggle(item: InstallerRecord & { id: string }) {
		const list = data()?.installers ?? [];
		if (
			installerActionBlock(
				item as InstallerRecord,
				list as InstallerRecord[],
				data()?.allowUnsignedPublishing ?? false
			)
		)
			return;
		let response;
		if (item.updateState && item.updateState !== 'legacy') {
			response =
				item.updateState === 'staged'
					? await apiClient.v1.admin.installers['publish-desktop'].post({ id: item.id })
					: await apiClient.v1.admin.installers['withdraw-desktop'].post({ id: item.id });
		} else {
			response = await apiClient.v1.admin.installers['set-downloadable'].post({
				id: item.id,
				canBeDownloaded: !item.canBeDownloaded
			});
		}
		if (response.error) {
			window.alert(err(response, m.admin_releases_availability_fallback()));
			return;
		}
		await refresh();
	}
	return (
		<Show when={data()}>
			{(current) => (
				<>
					<p class="mb-5 border-l-2 border-amber-500 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
						{current().allowUnsignedPublishing
							? m.admin_releases_development_policy()
							: m.admin_releases_production_policy()}
					</p>
					<ReleaseManager
						Icon={HardDrive}
						title={m.admin_releases_category_installers()}
						description={m.admin_releases_installers_description()}
						items={current().installers}
						stats={[
							{
								label: m.admin_releases_total_downloads(),
								value: current().totalDownloads.toLocaleString()
							},
							{
								label: m.admin_releases_active_builds(),
								value: String(current().installers.length)
							},
							{
								label: m.admin_releases_published_builds(),
								value: String(
									current().installers.filter(
										(x) => x.canBeDownloaded && x.artifactValidatedAt
									).length
								)
							}
						]}
						uploadTitle={m.admin_releases_upload_installer_title()}
						uploadSubtitle={m.admin_releases_upload_installer_description()}
						fileFieldLabel={m.admin_releases_installer_file_label()}
						fileInputId="installer-file"
						fileAccept={os() === 'windows' ? '.msi,.exe' : '.tar.gz,application/gzip'}
						onRefresh={refresh}
						uploadFields={() => (
							<>
								<label class="flex flex-col gap-2 text-sm font-medium">
									{m.admin_releases_modal_version()}
									<input
										class={input}
										name="version"
										required
										value={version()}
										placeholder={m.admin_releases_expected_version_placeholder()}
										onInput={(e) => setVersion(e.currentTarget.value)}
									/>
								</label>
								<div class="grid gap-4 sm:grid-cols-2">
									<label class="flex flex-col gap-2 text-sm font-medium">
										{m.admin_releases_modal_os()}
										<select
											name="os"
											class={input}
											value={os()}
											onChange={(e) => setOs(e.currentTarget.value)}
										>
											<Show when={current().allowUnsignedPublishing}>
												<option value="windows">Windows</option>
											</Show>
											<option value="linux">Linux</option>
										</select>
									</label>
									<label class="flex flex-col gap-2 text-sm font-medium">
										{m.admin_releases_modal_arch()}
										<div class={input + ' flex items-center'}>x64</div>
									</label>
								</div>
								<div
									class="border-l-2 border-amber-500 bg-muted/40 px-4 py-3"
									aria-label={m.admin_releases_expected_artifact()}
								>
									<strong class="text-sm">
										{m.admin_releases_expected_artifact()}
									</strong>
									<code class="mt-2 block text-xs break-all">
										{expectedInstallerFiles(os(), version() || '0.1.0').join(
											' / '
										)}
									</code>
									<p class="mt-2 text-xs text-muted-foreground">
										{os() === 'windows'
											? m.admin_releases_windows_upload_help()
											: m.admin_releases_linux_upload_help()}
									</p>
								</div>
							</>
						)}
						validateUpload={validate}
						submitUpload={upload}
						submitDelete={remove}
						onUploadSuccess={() => {
							setOs('linux');
							setVersion('');
						}}
						columns={() => (
							<>
								<th class={th}>{m.admin_releases_column_version()}</th>
								<th class={th}>{m.admin_releases_column_file()}</th>
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
						row={(item, index, actions) => {
							const blocked = () =>
								installerActionBlock(
									item as InstallerRecord,
									current().installers as InstallerRecord[],
									current().allowUnsignedPublishing
								);
							return (
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
										<code class="block max-w-56 truncate text-xs text-muted-foreground">
											{item.fileName}
										</code>
										<div class="mt-1 flex gap-3 text-xs text-muted-foreground">
											<span class="flex items-center gap-1">
												<Layers class="size-3" />
												{item.os}
											</span>
											<span class="flex items-center gap-1">
												<Cpu class="size-3" />
												{item.architecture}
											</span>
										</div>
										<p class="mt-1 flex gap-1 text-xs text-muted-foreground">
											<Show when={item.artifactValidatedAt}>
												<ShieldCheck class="size-3" />
											</Show>
											{item.artifactValidatedAt
												? m.admin_releases_file_validated()
												: m.admin_releases_file_unverified()}
										</p>
										<p class="text-xs text-muted-foreground">
											{item.updateState !== 'legacy' && item.signedEnvelope
												? m.admin_releases_signed_candidate()
												: m.admin_releases_legacy_candidate()}
										</p>
									</td>
									<td class={td + ' text-center'}>
										<span class="rounded border px-2 py-1 text-xs">
											{item.canBeDownloaded && item.artifactValidatedAt
												? m.admin_releases_status_live()
												: item.updateState === 'withdrawn'
													? m.admin_releases_signed_withdrawn()
													: m.admin_releases_status_staged()}
										</span>
									</td>
									<td class={td + ' text-center font-mono text-sm'}>
										{item.downloadCount.toLocaleString()}
									</td>
									<td class={td + ' text-sm text-muted-foreground'}>
										<span class="flex items-center gap-1">
											<Calendar class="size-4" />
											{date(item.createdAt)}
										</span>
									</td>
									<td class={td + ' text-right'}>
										<div class="flex justify-end gap-2">
											<button
												type="button"
												class={button}
												disabled={!!blocked()}
												onClick={() => void toggle(item)}
												title={
													blocked() ? blockLabel(blocked()!) : undefined
												}
											>
												{item.canBeDownloaded
													? m.admin_releases_withdraw()
													: m.admin_releases_make_available()}
											</button>
											<button
												type="button"
												class={button}
												disabled={
													!!item.updateState &&
													item.updateState !== 'legacy'
												}
												title={m.admin_releases_delete_record()}
												aria-label={m.admin_releases_delete_record()}
												onClick={() => actions.confirmDelete(item)}
											>
												<Trash2 class="size-4" />
											</button>
										</div>
										<Show when={blocked()}>
											<p class="mt-2 max-w-64 text-right text-xs text-muted-foreground">
												{blockLabel(blocked()!)}
											</p>
										</Show>
									</td>
								</>
							);
						}}
						empty={(open) => (
							<tr>
								<td colspan={6} class="p-8 text-center">
									<p>{m.admin_releases_empty_installers_title()}</p>
									<p class="text-sm text-muted-foreground">
										{m.admin_releases_empty_installers_description()}
									</p>
									<button class={button + ' mt-3'} onClick={open}>
										{m.admin_releases_deploy_first()}
									</button>
								</td>
							</tr>
						)}
						deleteBody={(item) => (
							<p class="text-sm text-muted-foreground">
								{m.admin_releases_delete_installer({
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
