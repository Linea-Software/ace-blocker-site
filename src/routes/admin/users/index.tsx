import DialogShell from '../../account/_components/DialogShell';
import { createSignal, createMemo, For, Show } from 'solid-js';
import { revalidate, useSearchParams } from '@solidjs/router';
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
} from '@lucide/solid';
import { apiClient } from '$lib/api-client';
import { countMessage } from '$lib/utils/count-message';
import * as m from '$lib/paraglide/messages';
import { getUsersData } from './data';

const card = 'min-w-0 rounded-lg border border-border bg-card',
	input = 'min-h-9 w-full rounded-md border bg-background px-3 text-sm',
	btn =
		'inline-flex min-h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium disabled:opacity-40 hover:bg-muted',
	th = 'h-11 px-5 text-left text-xs font-medium text-muted-foreground',
	td = 'px-5 py-4';
const date = (v: Date | string | null) =>
	v
		? new Date(v).toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			})
		: '—';
const isPro = (person: { proExpiration?: Date | string | null }) =>
	!!(person.proExpiration && new Date(person.proExpiration) > new Date());
const errorText = (response: { error?: unknown }) =>
	response?.error && typeof response.error === 'object' && 'message' in response.error
		? String(response.error.message)
		: m.admin_users_action_failed();

export default function AdminUsersPage() {
	const [searchParams] = useSearchParams();
	const data = createMemo(() =>
		getUsersData(typeof searchParams.search === 'string' ? searchParams.search : '')
	);
	const [selectedUser, setSelectedUser] = createSignal<{ id: string; name: string } | null>(null);
	const [unit, setUnit] = createSignal('Months');
	const [granting, setGranting] = createSignal(false);
	const [pending, setPending] = createSignal<string | null>(null);
	const refresh = () => revalidate(getUsersData.key);
	const summary = createMemo(() => [
		{ label: m.admin_users_total(), value: data()?.summary.total ?? 0, Icon: Users },
		{ label: m.admin_users_active(), value: data()?.summary.active ?? 0, Icon: ShieldCheck },
		{ label: m.admin_users_pro(), value: data()?.summary.pro ?? 0, Icon: Gauge },
		{ label: m.admin_users_admins(), value: data()?.summary.admins ?? 0, Icon: UserCog }
	]);
	async function toggleStatus(person: { id: string; banned: boolean | null }) {
		setPending(person.id);
		try {
			const response = await apiClient.v1.admin.users['toggle-status'].post({
				userId: person.id,
				isBanned: Boolean(person.banned)
			});
			if (response.error) {
				window.alert(errorText(response));
				return;
			}
			await refresh();
		} catch {
			window.alert(m.admin_users_action_failed());
		} finally {
			setPending(null);
		}
	}
	async function deleteUser(userId: string) {
		setPending(userId);
		try {
			const response = await apiClient.v1.admin.users.delete.post({ userId });
			if (response.error) {
				window.alert(errorText(response));
				return;
			}
			await refresh();
		} catch {
			window.alert(m.admin_users_action_failed());
		} finally {
			setPending(null);
		}
	}
	async function grant(event: SubmitEvent) {
		event.preventDefault();
		const target = selectedUser();
		if (!target) return;
		setGranting(true);
		try {
			const form = new FormData(event.currentTarget as HTMLFormElement);
			const response = await apiClient.v1.admin.users['grant-pro'].post({
				userId: target.id,
				duration: form.get('duration'),
				unit: unit()
			});
			if (response.error) {
				window.alert(errorText(response));
				return;
			}
			setSelectedUser(null);
			await refresh();
		} catch {
			window.alert(m.admin_users_action_failed());
		} finally {
			setGranting(false);
		}
	}
	return (
		<Show when={data()}>
			{(current) => (
				<>
					<div class="flex flex-col gap-8">
						<header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
							<div class="flex flex-col gap-2">
								<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
									<UserCog class="size-5" />
									{m.admin_users_eyebrow()}
								</div>
								<h2 class="font-display text-3xl font-semibold">
									{m.admin_users_title()}
								</h2>
								<p class="mt-1 max-w-2xl text-muted-foreground">
									{m.admin_users_description()}
								</p>
							</div>
							<form
								method="get"
								action="/admin/users"
								class="flex w-full gap-2 lg:max-w-md"
							>
								<label class="sr-only" for="user-search">
									{m.admin_users_search_label()}
								</label>
								<input
									id="user-search"
									type="search"
									name="search"
									class={input}
									placeholder={m.admin_users_search_placeholder()}
									value={
										typeof searchParams.search === 'string'
											? searchParams.search
											: ''
									}
								/>
								<button class={btn} type="submit">
									<Search class="size-4" />
									{m.admin_users_search_action()}
								</button>
							</form>
						</header>
						<section
							class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
							aria-label={m.admin_users_summary()}
						>
							<For each={summary()}>
								{(stat) => (
									<div class={card + ' p-5'}>
										<div class="flex items-center justify-between">
											<p class="text-sm font-medium text-muted-foreground">
												{stat.label}
											</p>
											<span class="rounded-lg bg-muted p-2">
												<stat.Icon class="size-4" />
											</span>
										</div>
										<p class="mt-3 font-display text-3xl font-semibold">
											{stat.value.toLocaleString()}
										</p>
									</div>
								)}
							</For>
						</section>
						<section class={card + ' overflow-hidden'}>
							<div class="border-b p-6">
								<h3 class="font-semibold">{m.admin_users_directory_title()}</h3>
								<p class="mt-1 text-sm text-muted-foreground">
									{searchParams.search
										? countMessage(
												current().users.length,
												m.admin_users_search_results_zero,
												m.admin_users_search_results_one,
												() =>
													m.admin_users_search_results({
														count: current().users.length
													})
											)
										: countMessage(
												current().users.length,
												m.admin_users_directory_description_zero,
												m.admin_users_directory_description_one,
												() =>
													m.admin_users_directory_description({
														count: current().users.length
													})
											)}
								</p>
							</div>
							<div class="overflow-x-auto">
								<table class="w-full border-collapse text-left">
									<thead class="bg-muted/50">
										<tr class="border-b">
											<th class={th}>{m.admin_users_column_user()}</th>
											<th class={th}>{m.admin_users_column_role()}</th>
											<th class={th}>{m.admin_users_column_status()}</th>
											<th class={th}>{m.admin_users_column_license()}</th>
											<th class={th}>{m.admin_users_column_joined()}</th>
											<th class={th + ' text-right'}>
												{m.admin_users_column_actions()}
											</th>
										</tr>
									</thead>
									<tbody class="divide-y">
										<For
											each={current().users}
											fallback={
												<tr>
													<td colspan={6} class="h-40 text-center">
														<p class="font-medium">
															{m.admin_users_empty_title()}
														</p>
														<p class="mt-1 text-sm text-muted-foreground">
															{m.admin_users_empty_description()}
														</p>
													</td>
												</tr>
											}
										>
											{(person) => (
												<tr class="hover:bg-muted/40">
													<td class={td}>
														<div class="flex min-w-52 flex-col">
															<span class="font-medium">
																{person.name}
															</span>
															<span class="flex items-center gap-1 text-xs text-muted-foreground">
																<Mail class="size-3" />
																{person.email}
															</span>
														</div>
													</td>
													<td class={td}>
														<span class="rounded border px-2 py-1 text-xs capitalize">
															{person.role ??
																m.admin_users_user_role()}
														</span>
													</td>
													<td class={td}>
														<span class="rounded border px-2 py-1 text-xs">
															{person.banned
																? m.admin_users_banned()
																: m.admin_users_active()}
														</span>
													</td>
													<td class={td}>
														<span class="rounded border px-2 py-1 text-xs">
															{isPro(person)
																? m.admin_users_pro()
																: m.admin_users_free()}
														</span>
													</td>
													<td
														class={
															td + ' text-sm text-muted-foreground'
														}
													>
														{date(person.createdAt)}
													</td>
													<td class={td + ' text-right'}>
														<details class="relative inline-block text-left">
															<summary
																class={
																	btn +
																	' cursor-pointer list-none'
																}
																aria-label={m.admin_users_open_menu(
																	{ name: person.name }
																)}
																aria-disabled={
																	pending() === person.id
																		? 'true'
																		: 'false'
																}
															>
																<MoreHorizontal class="size-4" />
															</summary>
															<div class="absolute right-0 z-20 mt-1 flex w-52 flex-col rounded-lg border bg-popover p-1 shadow-lg">
																<p class="px-2 py-1 text-xs font-semibold text-muted-foreground">
																	{m.admin_users_actions()}
																</p>
																<button
																	class="rounded px-2 py-2 text-left text-sm hover:bg-muted"
																	type="button"
																	disabled={
																		pending() === person.id
																	}
																	onClick={() =>
																		setSelectedUser({
																			id: person.id,
																			name: person.name
																		})
																	}
																>
																	<Gauge class="mr-2 inline size-4" />
																	{m.admin_users_grant_pro()}
																</button>
																<button
																	class="rounded px-2 py-2 text-left text-sm hover:bg-muted"
																	type="button"
																	disabled={
																		pending() === person.id
																	}
																	onClick={() =>
																		void toggleStatus(person)
																	}
																>
																	<UserX class="mr-2 inline size-4" />
																	{person.banned
																		? m.admin_users_restore()
																		: m.admin_users_ban()}
																</button>
																<div class="my-1 border-t" />
																<Show
																	when={person.role !== 'admin'}
																	fallback={
																		<p class="px-2 py-2 text-sm text-muted-foreground">
																			{m.account_admin_protected_title()}
																		</p>
																	}
																>
																	<button
																		class="rounded px-2 py-2 text-left text-sm text-destructive hover:bg-muted"
																		type="button"
																		disabled={
																			pending() === person.id
																		}
																		onClick={() =>
																			void deleteUser(
																				person.id
																			)
																		}
																	>
																		<Trash2 class="mr-2 inline size-4" />
																		{m.admin_users_delete()}
																	</button>
																</Show>
															</div>
														</details>
													</td>
												</tr>
											)}
										</For>
									</tbody>
								</table>
							</div>
						</section>
					</div>
					<Show when={selectedUser()}>
						{(person) => (
							<DialogShell
								open={true}
								onOpenChange={(open) => {
									if (!open && !granting()) setSelectedUser(null);
								}}
								title={m.admin_users_grant_pro_title()}
								description={m.admin_users_grant_pro_description({
									name: person().name
								})}
							>
								<form class="mt-5 flex flex-col gap-5" onSubmit={grant}>
									<label class="flex flex-col gap-2 text-sm font-medium">
										{m.admin_users_duration()}
										<input
											id="duration"
											class={input}
											name="duration"
											type="number"
											min="1"
											value="1"
											required
										/>
									</label>
									<label class="flex flex-col gap-2 text-sm font-medium">
										{m.admin_users_unit()}
										<select
											class={input}
											name="unit"
											value={unit()}
											onChange={(e) => setUnit(e.currentTarget.value)}
										>
											<option value="Days">{m.admin_users_days()}</option>
											<option value="Months">{m.admin_users_months()}</option>
											<option value="Years">{m.admin_users_years()}</option>
										</select>
									</label>
									<div class="flex justify-end gap-3">
										<button
											type="button"
											class={btn}
											onClick={() => setSelectedUser(null)}
										>
											{m.account_cancel_action()}
										</button>
										<button
											type="submit"
											class={btn + ' bg-primary text-primary-foreground'}
											disabled={granting()}
										>
											<Gauge class="size-4" />
											{granting()
												? m.admin_users_granting()
												: m.admin_users_grant_pro_action()}
										</button>
									</div>
								</form>
							</DialogShell>
						)}
					</Show>
				</>
			)}
		</Show>
	);
}
