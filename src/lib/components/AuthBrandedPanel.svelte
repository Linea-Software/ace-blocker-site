<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import darkFullLogo from '$lib/assets/logo/SVG/dark-full-logo.svg';
</script>

<!-- Left Side: Branded Panel (Desktop Only) -->
<div
	class="relative hidden w-1/2 flex-col justify-between bg-gradient-to-br from-[#0c111d] to-[#030712] p-12 lg:flex"
>
	<div
		class="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-brand)_0%,_transparent_70%)] opacity-10"
	></div>

	<a href="/" class="relative z-10 flex items-center transition-opacity hover:opacity-80">
		<img src={darkFullLogo} alt="Ace Blocker" class="h-9 w-auto" />
	</a>

	<div class="relative z-10 space-y-6">
		<h1 class="text-6xl leading-tight font-extrabold tracking-tight text-white">
			{m.auth_reclaim_focus_title()}<br />
			<span class="text-brand">{m.auth_reclaim_focus_subtitle()}</span>
		</h1>
		<p class="max-w-md text-xl text-slate-400">
			{m.hero_description()}
		</p>
	</div>

	<div class="relative z-10">
		<p class="text-sm text-slate-500">
			&copy; {new Date().getFullYear()}
			{m.footer_rights_suffix()}
		</p>
	</div>
</div>
